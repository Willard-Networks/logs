import mysql from "mysql2";
import SteamID from "steamid";
import { LogEntry } from "logs";
import { Query } from "express-serve-static-core";
import * as config from "./secrets";

abstract class BaseDatabase {
    private readonly _adminQuery: string;
    private readonly _target: string;

    abstract getRank(steamid: string): Promise<string | undefined>;
    abstract getLogs(query: Query): Promise<LogEntry[]>;
    abstract getLogById(id: number): Promise<LogEntry | null>;
    abstract getLogsByTimeRange(startTime: number, endTime: number): Promise<LogEntry[]>;
    abstract getTicketStatistics(startDate: string, endDate: string): Promise<any[]>;

    protected constructor() {
        let target, table, identifier;

        switch (config.ADMIN_MOD) {
            case "serverguard":
                target = "rank";
                table = "serverguard_users";
                identifier = "steam_id";
                break;

            case "ulx":
                target = "usergroup";
                table = "WUMALookup";
                identifier = "steamid";
                break;

            case "sam":
                target = "rank";
                table = "sam_players";
                identifier = "steamid";
                break;
        }

        this._adminQuery = `SELECT ${target} FROM ${table} WHERE ${identifier} = ?;`;
        this._target = target;
    }

    public get adminQuery(): string {
        return this._adminQuery;
    }

    public get target(): string {
        return this._target;
    }

    public userID(input: string): string {
        try {
            const trimmedInput = input.trim();
            const steam = new SteamID(trimmedInput);
            switch (config.ADMIN_MOD) {
                case "serverguard":
                case "sam":
                case "ulx":
                    return steam.getSteam2RenderedID();
            }
        } catch (error) {
            console.error(`Invalid SteamID provided: ${input}. Error: ${error}`);
            throw error;
        }
    }

    public buildQuery(args: Query): { query: string; values: (string | number)[] } {
        let logQuery = "SELECT * FROM ix_logs";
        let whereClause = "";
        let limitClause = "";
        const values: (string | number)[] = [];

        for (const key in args) {
            let value: any = args[key];
            // trim leading/trailing whitespace
            if (typeof value === "string") {
                value = value.trim();
            }
            if (value !== "") { // only add to the query if it has a non-empty value
                switch (key) {
                    case "text":
                        whereClause += `${whereClause.length > 0 ? " AND " : " WHERE "}text LIKE ?`;
                        values.push(`%${value}%`);
                        break;

                    case "steamid":
                        if (value) {
                            const sanitisedSteamID = value.replace(/["']/g, "");
                            try {
                                if (new SteamID(sanitisedSteamID).isValid()) {
                                    const steamID64 = new SteamID(sanitisedSteamID).getSteamID64();
                                    whereClause += `${whereClause.length > 0 ? " AND " : " WHERE "}steamid LIKE ?`;
                                    values.push(steamID64);
                                } else {
                                    whereClause += `${whereClause.length > 0 ? " AND " : " WHERE "}steamid LIKE ?`;
                                    values.push(value);
                                }
                            } catch (err) {
                                console.error("Invalid Steam ID");
                            }
                        }
                        break;

                    case "before":
                        const beforeDate = value.replace(/'/g, "");
                        const unixDateBefore = new Date(beforeDate).getTime() / 1000;
                        if (!isNaN(unixDateBefore)) {
                            whereClause += `${whereClause.length > 0 ? " AND " : " WHERE "}datetime < ?`;
                            values.push(unixDateBefore);
                        }
                        break;

                    case "after":
                        const afterDate = value.replace(/'/g, "");
                        const unixDateAfter = new Date(afterDate).getTime() / 1000;
                        if (!isNaN(unixDateAfter)) {
                            whereClause += `${whereClause.length > 0 ? " AND " : " WHERE "}datetime > ?`;
                            values.push(unixDateAfter);
                        }
                        break;

                    case "limit":
                        limitClause = " LIMIT ?";
                        values.push(parseInt(value));
                        break;

                    default:
                        whereClause += `${whereClause.length > 0 ? " AND " : " WHERE "}${key} = ?`;
                        values.push(value);
                        break;
                }
            }
        }

        logQuery += whereClause;
        logQuery += " ORDER BY id DESC";
        logQuery += limitClause.length > 0 ? limitClause : " LIMIT 5000";
        logQuery += ";";

        return { query: logQuery, values: values };
    }
}

export class MySqlDatabase extends BaseDatabase {
    private pool: mysql.Pool;
    private samPool: mysql.Pool;

    constructor() {
        super();
        this.setup().catch(error => {
            console.error("Error setting up connection pool: ", error);
        });
    }

    private async setup(): Promise<void> {
        this.pool = mysql.createPool({
            user: config.MYSQL_USER,
            password: config.MYSQL_PASS,
            host: config.MYSQL_HOST,
            port: parseInt(config.MYSQL_PORT),
            database: config.MYSQL_DB
        });

        this.samPool = mysql.createPool({
            user: config.MYSQL_USER,
            password: config.MYSQL_PASS,
            host: config.MYSQL_HOST,
            port: parseInt(config.MYSQL_PORT),
            database: config.MYSQL_SAM_DB
        });
    }

    public async getRank(steamid: string): Promise<string | undefined> {
        try {
            const trimmedSteamId = steamid.trim();
            const promisePool = this.samPool.promise();
            const [rows] = await promisePool.query(this.adminQuery, this.userID(trimmedSteamId));
            const [, result] = Object.entries(rows)[0];
            return result[this.target as keyof typeof result];
        } catch (err) {
            console.error("Error executing query, closing samPool and creating a new one", err);
            await this.samPool.end();

            // Recreate the samPool
            this.samPool = mysql.createPool({
                user: config.MYSQL_USER,
                password: config.MYSQL_PASS,
                host: config.MYSQL_HOST,
                port: parseInt(config.MYSQL_PORT),
                database: config.MYSQL_SAM_DB,
            });

            const promisePool = this.samPool.promise();
            const trimmedSteamId = steamid.trim();
            const [rows] = await promisePool.query(this.adminQuery, this.userID(trimmedSteamId));
            const [, result] = Object.entries(rows)[0];
            return result[this.target as keyof typeof result];
        }
    }

    public async getLogs(args: Query): Promise<LogEntry[]> {
        try {
            const promisePool = this.pool.promise();
            const { query, values } = this.buildQuery(args);
            const [rows] = await promisePool.query(query, values);
            return rows as LogEntry[];
        } catch (err) {
            console.error("Error executing query, closing pool and creating a new one", err);
            await this.pool.end();

            this.setup().catch(error => {
                console.error("Error setting up connection pool: ", error);
            });
            const promisePool = this.pool.promise();
            const { query, values } = this.buildQuery(args);
            const [rows] = await promisePool.query(query, values);
            return rows as LogEntry[];
        }
    }

    public async getLogById(id: number): Promise<LogEntry | null> {
        try {
            const promisePool = this.pool.promise();
            const [rows] = await promisePool.query("SELECT * FROM ix_logs WHERE id = ? LIMIT 1", [id]);
            const logEntries = rows as LogEntry[];
            return logEntries.length > 0 ? logEntries[0] : null;
        } catch (err) {
            console.error("Error executing query", err);
            return null;
        }
    }

    public async getLogsByTimeRange(startTime: number, endTime: number): Promise<LogEntry[]> {
        try {
            const promisePool = this.pool.promise();
            const [rows] = await promisePool.query(
                "SELECT * FROM ix_logs WHERE datetime BETWEEN ? AND ? ORDER BY datetime ASC",
                [startTime, endTime]
            );
            return rows as LogEntry[];
        } catch (err) {
            console.error("Error executing query", err);
            return [];
        }
    }

    public async getTicketStatistics(startDate: string, endDate: string): Promise<any[]> {
        try {
            const promisePool = this.pool.promise();
            const query = `
                SELECT
                    ix_players.steam_name,
                    ix_logs.steamid,
                    COUNT(*) AS tickets 
                FROM
                    ix_logs
                LEFT JOIN 
                    ix_players 
                ON 
                    ix_players.steamid = ix_logs.steamid
                WHERE 
                    log_type = "samReportClaimed"
                AND
                    FROM_UNIXTIME(ix_logs.datetime) > STR_TO_DATE(?, '%M %d %Y %h:%i%p')
                AND
                    FROM_UNIXTIME(ix_logs.datetime) < STR_TO_DATE(?, '%M %d %Y %h:%i%p')
                GROUP BY steamid
                ORDER BY tickets DESC
            `;
            
            const [rows] = await promisePool.query(query, [startDate, endDate]);
            return rows as any[];
        } catch (err) {
            console.error("Error executing ticket statistics query", err);
            return [];
        }
    }
}
