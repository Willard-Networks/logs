import { Request, Response } from "express";
import fs from "fs";

import { LogEntry } from "../types/logs";
import { formatLogs } from "../util/logFormatter";
import { cacheLogContext, getCachedLogContext } from "../util/redis";
import { getAvailableMonths, getMonthDateRange } from "../util/dateUtils";

import * as config from "../util/secrets";

import { database } from "../app";

/**
 * Logs panel.
 * @route GET /panel
 */
export const index = async (req: Request, res: Response): Promise<void> => {
    const logs: LogEntry[] = await database.getLogs(req.query);

    res.render("panel", {
        user: req.user,
        logs: logs,
        rank: req.user.rank
    });
};

/**
 * Get context logs around a specific log entry.
 * @route GET /panel/context/:logId
 */
export const getLogContext = async (req: Request, res: Response): Promise<void> => {
    const logId = parseInt(req.params.logId);
    if (isNaN(logId)) {
        res.status(400).send("Invalid log ID");
        return;
    }

    try {
        // Try to get cached context first
        const cachedContext = await getCachedLogContext(logId);
        if (cachedContext) {
            res.json(cachedContext);
            return;
        }

        // If not in cache, fetch from database
        const targetLog = await database.getLogById(logId);
        if (!targetLog) {
            res.status(404).send("Log not found");
            return;
        }

        // Get logs within 5 minutes before and after the target log
        const contextTimeRange = 5 * 60; // 5 minutes in seconds
        const beforeTime = targetLog.datetime - contextTimeRange;
        const afterTime = targetLog.datetime + contextTimeRange;

        const contextLogs = await database.getLogsByTimeRange(beforeTime, afterTime);
        
        // Split logs into before and after
        const beforeLogs = contextLogs.filter(log => log.datetime < targetLog.datetime);
        const afterLogs = contextLogs.filter(log => log.datetime > targetLog.datetime);

        const contextData = {
            before: beforeLogs,
            target: targetLog,
            after: afterLogs
        };

        // Cache the context data
        await cacheLogContext(logId, contextData);

        res.json(contextData);
    } catch (error) {
        console.error("Error fetching log context:", error);
        res.status(500).send("Error fetching log context");
    }
};

export const downloadLogs = async (req: Request, res: Response): Promise<void> => {
    const logs: LogEntry[] = await database.getLogs(req.query);
    const formattedLogs = formatLogs(logs);

    // Generate filename with current timestamp in format: YYYY-MM-DD_HH-mm-ss
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const timestamp = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
    const filePath = `logs-${timestamp}.txt`;

    // Write logs to file
    fs.writeFile(filePath, formattedLogs, (err: unknown) => {
        if (err) {
            console.log(err);
            res.status(500).send("Error writing to file");
        } else {
            // Set the headers and send the file
            res.setHeader("Content-Type", "text/plain");
            res.download(filePath, (err: unknown) => {
                if (err) {
                    console.log(err);
                    res.status(500).send("Error downloading file");
                }
                // Clean up: delete the file after download
                fs.unlink(filePath, (err) => {
                    if (err) console.log("Error deleting temporary file:", err);
                });
            });
        }
    });
};

/**
 * Ticket statistics page.
 * @route GET /ticket-statistics
 */
export const ticketStatistics = async (req: Request, res: Response): Promise<void> => {
    // Get available months (last 3 months)
    const availableMonths = getAvailableMonths();
    
    // Default to current month or use selected month if valid
    const selectedMonthYear = req.query.period ? req.query.period.toString() : `${availableMonths[0].month}-${availableMonths[0].year}`;
    const [selectedMonth, selectedYear] = selectedMonthYear.split("-").map(num => parseInt(num));
    
    // Validate that the selected month/year is in the available options
    const isValidSelection = availableMonths.some(option => 
        option.month === selectedMonth && option.year === parseInt(selectedYear.toString()));
    
    // If invalid selection, default to current month
    const month = isValidSelection ? selectedMonth : availableMonths[0].month;
    const year = isValidSelection ? selectedYear : availableMonths[0].year;
    
    // Get date range for the query
    const { startDate, endDate } = getMonthDateRange(month, year);
    
    // Get ticket statistics
    const statistics = await database.getTicketStatistics(startDate, endDate);
    
    res.render("ticket-statistics", {
        user: req.user,
        rank: req.user.rank,
        statistics: statistics,
        selectedPeriod: `${month}-${year}`,
        availableMonths: availableMonths
    });
};
