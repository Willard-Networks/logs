import { Request, Response } from "express";
import fs from "fs";

import { LogEntry } from "../types/logs";
import { formatLogs } from "../util/logFormatter";

import * as config from "../util/secrets";

import { database } from "../app";

/**
 * Logs panel.
 * @route GET /panel
 */
export const index = async (req: Request, res: Response): Promise<void> => {
    const rank = await database.getRank(req.user.id);

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
    const rank = await database.getRank(req.user.id);

    if (!rank || !config.ALLOWED_RANKS.includes(rank)) {
        res.status(403).send("Unauthorized");
        return;
    }

    const logId = parseInt(req.params.logId);
    if (isNaN(logId)) {
        res.status(400).send("Invalid log ID");
        return;
    }

    // Get the target log first to get its datetime
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
    
    res.json({
        before: contextLogs.filter(log => log.datetime < targetLog.datetime),
        target: targetLog,
        after: contextLogs.filter(log => log.datetime > targetLog.datetime)
    });
};

export const downloadLogs = async (req: Request, res: Response): Promise<void> => {
    const rank = await database.getRank(req.user.id);

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
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
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
