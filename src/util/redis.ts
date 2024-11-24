import { createClient } from "redis";

// Redis client setup with retry logic
const redisClient = createClient({
    url: `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || 6379}`,
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 20) {
                console.error("Redis connection failed after 20 retries");
                return new Error("Redis connection failed");
            }
            return Math.min(retries * 100, 3000);
        }
    }
});

redisClient.on("error", (err) => {
    console.error("Redis Client Error", err);
});

redisClient.on("connect", () => console.log("Redis Cache Client Connected"));
redisClient.on("reconnecting", () => console.log("Redis Cache Client Reconnecting"));

// Connect to Redis
(async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        console.error("Failed to connect to Redis cache:", err);
    }
})();

// Cache TTLs
const CACHE_TTL = {
    LOG_CONTEXT: 60 * 60, // 1 hour
    USER_RANK: 60 * 5,    // 5 minutes
};

export const cacheLogContext = async (logId: number, data: any) => {
    try {
        await redisClient.setEx(
            `log:context:${logId}`,
            CACHE_TTL.LOG_CONTEXT,
            JSON.stringify(data)
        );
    } catch (error) {
        console.error("Error caching log context:", error);
    }
};

export const getCachedLogContext = async (logId: number) => {
    try {
        const cached = await redisClient.get(`log:context:${logId}`);
        return cached ? JSON.parse(cached) : null;
    } catch (error) {
        console.error("Error getting cached log context:", error);
        return null;
    }
};

export const cacheUserRank = async (userId: string, rank: string) => {
    try {
        await redisClient.setEx(
            `user:rank:${userId}`,
            CACHE_TTL.USER_RANK,
            rank
        );
    } catch (error) {
        console.error("Error caching user rank:", error);
    }
};

export const getCachedUserRank = async (userId: string) => {
    try {
        return await redisClient.get(`user:rank:${userId}`);
    } catch (error) {
        console.error("Error getting cached user rank:", error);
        return null;
    }
};

// Graceful shutdown
process.on("SIGTERM", async () => {
    console.log("Received SIGTERM signal, closing Redis cache connection...");
    await redisClient.quit();
});

export default redisClient;
