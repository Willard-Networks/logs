import { LogEntry } from "../types/logs";

function convertTimestamp(unixTimestamp: number): string {
    const date = new Date(unixTimestamp * 1000);
    return date.toTimeString().split(' ')[0];
}

function convertSteamID(steam64: string): string {
    const steamID = BigInt(steam64);
    const constant = BigInt("76561197960265728");
    const accountID = steamID - constant;
    const server = accountID % BigInt(2);
    const authID = accountID / BigInt(2);
    return `STEAM_0:${server}:${authID}`;
}

function formatLogEntry(entry: LogEntry): string {
    const timestamp = convertTimestamp(entry.time);
    
    switch (entry.type) {
        case 'chat':
            return `[${timestamp}] ${entry.string}`;
            
        case 'command':
            return `[${timestamp}] ${entry.string}`;
            
        case 'characterUnloaded':
            return `[${timestamp}] ${entry.string}`;
            
        case 'connect':
            return `[${timestamp}] ${entry.string} has connected.`;
            
        case 'disconnect':
            const steamID = entry.steamid ? ` (${convertSteamID(entry.steamid)})` : '';
            return `[${timestamp}] ${entry.string}${steamID}`;
            
        case 'characterLoaded':
            return `[${timestamp}] ${entry.string}`;
            
        default:
            return `[${timestamp}] ${entry.string}`;
    }
}

export function formatLogs(logs: LogEntry[]): string {
    return logs
        .filter(log => log.string !== null)  // Filter out logs with no string content
        .map(entry => formatLogEntry(entry))
        .join('\n');
}
