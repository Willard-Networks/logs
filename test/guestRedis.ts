// Route tests cover guests only. Keep them independent of an external Redis
// service; authenticated sessions and cache integration require separate tests.
jest.mock("../src/util/redis", () => ({
    __esModule: true,
    default: {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue("OK"),
        del: jest.fn().mockResolvedValue(0),
        expire: jest.fn().mockResolvedValue(1)
    },
    getCachedLogContext: jest.fn().mockResolvedValue(null),
    cacheLogContext: jest.fn().mockResolvedValue(undefined),
    getCachedUserRank: jest.fn().mockResolvedValue(null),
    cacheUserRank: jest.fn().mockResolvedValue(undefined)
}));
