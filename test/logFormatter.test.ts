import { formatLogs } from '../src/util/logFormatter';
import { LogEntry } from '../src/types/logs';

describe('Log Formatter', () => {
    test('formats chat logs correctly', () => {
        const input: LogEntry[] = [{
            type: "chat",
            string: "[IC] Casey Sanchez: Black coral looks nice.",
            time: 1732470527,
            steamid: "76561198236432500",
            itemid: null,
            charid: "30352"
        }];

        const result = formatLogs(input);
        expect(result).toMatch(/^\[\d{2}:\d{2}:\d{2}\] \[IC\] Casey Sanchez: Black coral looks nice\.$/);
    });

    test('formats command logs correctly', () => {
        const input: LogEntry[] = [{
            type: "command",
            string: "C8:i1.UNION-1 used command '/Radio 10-7'.",
            time: 1732470526,
            steamid: "76561198264303356",
            itemid: null,
            charid: "29366"
        }];

        const result = formatLogs(input);
        expect(result).toMatch(/^\[\d{2}:\d{2}:\d{2}\] C8:i1\.UNION-1 used command '\/Radio 10-7'\.$/);
    });

    test('formats character unload logs correctly', () => {
        const input: LogEntry[] = [{
            type: "characterUnloaded",
            string: "Bounter has unloaded their \"Tadeusz Wachnicki\" character.",
            time: 1732470525,
            steamid: "76561198072614188",
            itemid: null,
            charid: "28155"
        }];

        const result = formatLogs(input);
        expect(result).toMatch(/^\[\d{2}:\d{2}:\d{2}\] Bounter has unloaded their "Tadeusz Wachnicki" character\.$/);
    });

    test('formats multiple logs correctly', () => {
        const input: LogEntry[] = [
            {
                type: "connect",
                string: "TestPlayer",
                time: 1732470525,
                steamid: "76561198236432500",
                itemid: null,
                charid: null
            },
            {
                type: "disconnect",
                string: "TestPlayer",
                time: 1732470526,
                steamid: "76561198236432500",
                itemid: null,
                charid: null
            }
        ];

        const result = formatLogs(input);
        const lines = result.split('\n');
        expect(lines).toHaveLength(2);
        expect(lines[0]).toMatch(/^\[\d{2}:\d{2}:\d{2}\] TestPlayer has connected\.$/);
        expect(lines[1]).toMatch(/^\[\d{2}:\d{2}:\d{2}\] TestPlayer \(STEAM_0:0:138083386\)$/);
    });
});
