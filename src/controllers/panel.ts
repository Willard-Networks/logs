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
