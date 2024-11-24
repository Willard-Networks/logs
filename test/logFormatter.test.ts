import { formatLogs } from '../src/util/logFormatter';
import { LogEntry } from '../src/types/logs';

describe('Log Formatter', () => {
    test('formats chat logs correctly', () => {
        const input: LogEntry[] = [{
            id: 46506098,
            steamid: "76561198236432500",
            char_id: 30352,
            log_type: "chat",
            pos_x: 3627.48,
            pos_y: 930.985,
            pos_z: 313.432,
            map: "rp_wn_city27_v1b",
            datetime: 1732470527,
            text: "[IC] Casey Sanchez: Black coral looks nice.",
            lookup1: "IC",
            lookup2: "Black coral looks nice.",
            lookup3: null
        }];

        const result = formatLogs(input);
        expect(result).toMatch(/^\[\d{2}:\d{2}:\d{2}\] \[IC\] Casey Sanchez: Black coral looks nice\.$/);
    });

    test('formats command logs correctly', () => {
        const input: LogEntry[] = [{
            id: 46506097,
            steamid: "76561198264303356",
            char_id: 29366,
            log_type: "command",
            pos_x: 4345.04,
            pos_y: 4910.15,
            pos_z: 296.025,
            map: "rp_wn_city27_v1b",
            datetime: 1732470526,
            text: "C8:i1.UNION-1 used command '/Radio 10-7'.",
            lookup1: "/Radio",
            lookup2: "10-7",
            lookup3: null
        }];

        const result = formatLogs(input);
        expect(result).toMatch(/^\[\d{2}:\d{2}:\d{2}\] C8:i1\.UNION-1 used command '\/Radio 10-7'\.$/);
    });

    test('formats character unload logs correctly', () => {
        const input: LogEntry[] = [{
            id: 46506096,
            steamid: "76561198072614188",
            char_id: 28155,
            log_type: "characterUnloaded",
            pos_x: 8331.29,
            pos_y: -3246.34,
            pos_z: 449.031,
            map: "rp_wn_city27_v1b",
            datetime: 1732470525,
            text: "Bounter has unloaded their \"Tadeusz Wachnicki\" character.",
            lookup1: "Tadeusz Wachnicki",
            lookup2: null,
            lookup3: null
        }];

        const result = formatLogs(input);
        expect(result).toMatch(/^\[\d{2}:\d{2}:\d{2}\] Bounter has unloaded their "Tadeusz Wachnicki" character\.$/);
    });

    test('formats multiple logs correctly', () => {
        const input: LogEntry[] = [
            {
                id: 1,
                steamid: "76561198236432500",
                char_id: 1,
                log_type: "connect",
                pos_x: 0,
                pos_y: 0,
                pos_z: 0,
                map: "rp_wn_city27_v1b",
                datetime: 1732470525,
                text: "TestPlayer has connected",
                lookup1: "TestPlayer",
                lookup2: null,
                lookup3: null
            },
            {
                id: 2,
                steamid: "76561198236432500",
                char_id: 1,
                log_type: "disconnect",
                pos_x: 0,
                pos_y: 0,
                pos_z: 0,
                map: "rp_wn_city27_v1b",
                datetime: 1732470526,
                text: "TestPlayer",
                lookup1: "timed out",
                lookup2: null,
                lookup3: null
            }
        ];

        const result = formatLogs(input);
        const lines = result.split('\n');
        expect(lines).toHaveLength(2);
        expect(lines[0]).toMatch(/^\[\d{2}:\d{2}:\d{2}\] TestPlayer has connected\.$/);
        expect(lines[1]).toMatch(/^\[\d{2}:\d{2}:\d{2}\] TestPlayer \(STEAM_0:0:138083386\)$/);
    });
});
