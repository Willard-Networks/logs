import { Request, Response } from "express";
import fs from "fs";

import { LogEntry } from "../types/logs";
import { formatLogs } from "../util/logFormatter";
import { cacheLogContext, getCachedLogContext, cacheUserRank, getCachedUserRank } from "../util/redis";

import * as config from "../util/secrets";

import { database } from "../app";

/**
 * Logs panel.
 * @route GET /panel
 */
export const index = async (req: Request, res: Response): Promise<void> => {
    // Try to get cached rank first
    const cachedRank = await getCachedUserRank(req.user.id);
    let rank = cachedRank;

    if (!cachedRank) {
        // If not in cache, get from database
        rank = await database.getRank(req.user.id);
        // Cache the rank for future requests
        if (rank) {
            await cacheUserRank(req.user.id, rank);
        }
    }

    if (!rank) {
        res.status(403).send("You need to join the server first!");
        return;
    }

    if (!config.ALLOWED_RANKS.includes(rank)) {
        res.status(403).send(
            `Your rank (${rank}) is not allowed to see this page.
            The allowed ranks are: ${config.ALLOWED_RANKS.join(", ")}.`
        );
        return;
    }

    const logs: LogEntry[] = await database.getLogs(req.query);

    res.render("panel", {
        user: req.user,
        logs: logs,
        rank: rank
    });
};

/**
 * Get context logs around a specific log entry.
 * @route GET /panel/context/:logId
 */
export const getLogContext = async (req: Request, res: Response): Promise<void> => {
    const rank = await getCachedUserRank(req.user.id) || await database.getRank(req.user.id);

    if (!rank || !config.ALLOWED_RANKS.includes(rank)) {
        res.status(403).send("Unauthorized");
        return;
    }

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
    const rank = await getCachedUserRank(req.user.id) || await database.getRank(req.user.id);

    if (!rank) {
        res.status(403).send("You need to join the server first!");
        return;
    }

    if (!config.ALLOWED_RANKS.includes(rank)) {
        res.status(403).send(
            `Your rank (${rank}) is not allowed to see this page.
            The allowed ranks are: ${config.ALLOWED_RANKS.join(", ")}.`
        );
        return;
    }

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
    // Try to get cached rank first
    const cachedRank = await getCachedUserRank(req.user.id);
    let rank = cachedRank;

    if (!cachedRank) {
        // If not in cache, get from database
        rank = await database.getRank(req.user.id);
        // Cache the rank for future requests
        if (rank) {
            await cacheUserRank(req.user.id, rank);
        }
    }

    if (!rank) {
        res.status(403).send("You need to join the server first!");
        return;
    }

    if (!config.ALLOWED_RANKS.includes(rank)) {
        res.status(403).send(
            `Your rank (${rank}) is not allowed to see this page.
            The allowed ranks are: ${config.ALLOWED_RANKS.join(", ")}.`
        );
        return;
    }

    // Get the current month and year
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Generate the last 3 months options
    const availableMonths = [];
    for (let i = 0; i < 3; i++) {
        let monthIndex = currentMonth - i;
        let yearValue = currentYear;
        
        if (monthIndex < 0) {
            monthIndex += 12;
            yearValue -= 1;
        }
        
        availableMonths.push({
            month: monthIndex + 1, // Convert to 1-based month
            year: yearValue,
            label: `${getMonthName(monthIndex + 1)} ${yearValue}`
        });
    }
    
    // Default to current month or use selected month if valid
    const selectedMonthYear = req.query.period ? req.query.period.toString() : `${availableMonths[0].month}-${availableMonths[0].year}`;
    const [selectedMonth, selectedYear] = selectedMonthYear.split('-').map(num => parseInt(num));
    
    // Validate that the selected month/year is in the available options
    const isValidSelection = availableMonths.some(option => 
        option.month === selectedMonth && option.year === parseInt(selectedYear.toString()));
    
    // If invalid selection, default to current month
    const month = isValidSelection ? selectedMonth : availableMonths[0].month;
    const year = isValidSelection ? selectedYear : availableMonths[0].year;
    
    // Format dates for the query
    const startDate = `${getMonthName(month)} 1 ${year} 1:00AM`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const endDate = `${getMonthName(nextMonth)} 1 ${nextYear} 1:00AM`;
    
    // Get ticket statistics
    const statistics = await database.getTicketStatistics(startDate, endDate);
    
    res.render("ticket-statistics", {
        user: req.user,
        rank: rank,
        statistics: statistics,
        selectedPeriod: `${month}-${year}`,
        availableMonths: availableMonths
    });
};

// Helper function to get month name
function getMonthName(month: number): string {
    const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    return monthNames[month - 1];
}
