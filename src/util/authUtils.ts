import { Request, Response } from "express";
import { cacheUserRank, getCachedUserRank } from "./redis";
import { database } from "../app";
import * as config from "./secrets";

/**
 * Interface for the result of checking user rank
 */
export interface RankCheckResult {
    isAuthorized: boolean;
    rank?: string;
    errorMessage?: string;
}

/**
 * Check if a user has the required rank to access a resource
 * @param userId The user's ID
 * @returns Promise with the result of the rank check
 */
export async function checkUserRank(userId: string): Promise<RankCheckResult> {
    // Try to get cached rank first
    const cachedRank = await getCachedUserRank(userId);
    let rank = cachedRank;

    if (!cachedRank) {
        // If not in cache, get from database
        rank = await database.getRank(userId);
        // Cache the rank for future requests
        if (rank) {
            await cacheUserRank(userId, rank);
        }
    }

    if (!rank) {
        return {
            isAuthorized: false,
            errorMessage: "You need to join the server first!"
        };
    }

    if (!config.ALLOWED_RANKS.includes(rank)) {
        return {
            isAuthorized: false,
            rank,
            errorMessage: `Your rank (${rank}) is not allowed to see this page.
            The allowed ranks are: ${config.ALLOWED_RANKS.join(", ")}.`
        };
    }

    return {
        isAuthorized: true,
        rank
    };
}

/**
 * Middleware to check if a user is authorized to access a resource
 * If not authorized, sends an appropriate error response
 * If authorized, adds the rank to the request object and calls next()
 * 
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 * @returns Promise that resolves when the check is complete
 */
export async function requireAuthorization(req: Request, res: Response, next: () => void): Promise<void> {
    const result = await checkUserRank(req.user.id);
    
    if (!result.isAuthorized) {
        res.status(403).send(result.errorMessage);
        return;
    }
    
    // Add the rank to the request object for use in the controller
    req.user.rank = result.rank;
    
    // Continue to the controller
    next();
} 