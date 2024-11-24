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
    const timestamp = convertTimestamp(entry.datetime);
    
    switch (entry.log_type) {
        case 'chat':
            return `[${timestamp}] ${entry.text}`;
            
        case 'command':
            return `[${timestamp}] ${entry.text}`;
            
        case 'characterUnloaded':
            return `[${timestamp}] ${entry.text}`;
            
        case 'connect':
            return `[${timestamp}] ${entry.lookup1} has connected.`;
            
        case 'disconnect':
            const steamID = entry.steamid ? ` (${convertSteamID(entry.steamid)})` : '';
            return `[${timestamp}] ${entry.text}${steamID}`;
            
        case 'characterLoaded':
            return `[${timestamp}] ${entry.lookup1} loaded the character '${entry.lookup2}'`;
            
        default:
            return `[${timestamp}] ${entry.text}`;
    }
}

export function formatLogs(logs: LogEntry[]): string {
    return logs
        .filter(log => log.text !== null)  // Filter out logs with no text content
        .map(entry => formatLogEntry(entry))
        .join('\n');
}
