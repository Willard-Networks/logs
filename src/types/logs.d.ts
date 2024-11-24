export interface LogEntry {
    id: number;
    steamid: string;
    char_id: number;
    log_type: string;
    pos_x: number;
    pos_y: number;
    pos_z: number;
    map: string;
    datetime: number;
    text: string;
    lookup1: string | null;
    lookup2: string | null;
    lookup3: string | null;
}
