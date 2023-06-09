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

    public buildQuery(args: Query): string {
        let logQuery = "SELECT * FROM ix_logs";
        let whereClause = "";
        let limitClause = "";
    
        for (const key in args) {
            let value = args[key];
            // trim leading/trailing whitespace
            if (typeof value === "string") {
                value = value.trim();
            }
            value = mysql.escape(value);
    
            switch (key) {
                case "text":
                    whereClause += `${whereClause.length > 0 ? " AND " : " WHERE "}text LIKE "%${value.replace(/'/g, "")}%"`;
                    break;
    
                case "steamid":
                    if (value) {
                        const sanitisedSteamID = value.replace(/["']/g, "");
                        if (new SteamID(sanitisedSteamID).getSteam2RenderedID() || new SteamID(sanitisedSteamID).getSteam2RenderedID(true)) {
                            const steamID64 = new SteamID(sanitisedSteamID).getSteamID64();
                            whereClause += `${whereClause.length > 0 ? " AND " : " WHERE "}steamid LIKE "${steamID64.replace(/'/g, "")}"`;
                        } else {
                            whereClause += `${whereClause.length > 0 ? " AND " : " WHERE "}steamid LIKE "${value.replace(/'/g, "")}"`;
                        }
                    }
                    break;
    
                case "before":
                    const beforeDate = value.replace(/'/g, "");
                    const unixDateBefore = new Date(beforeDate).getTime() / 1000;
                    whereClause += `${whereClause.length > 0 ? " AND " : " WHERE "}datetime < ${unixDateBefore}`;
                    break;
    
                case "after":
                    const afterDate = value.replace(/'/g, "");
                    const unixDateAfter = new Date(afterDate).getTime() / 1000;
                    whereClause += `${whereClause.length > 0 ? " AND " : " WHERE "}datetime > ${unixDateAfter}`;
                    break;
    
                case "limit":
                    limitClause = ` LIMIT ${value.replace(/'/g, "")}`;
                    break;
    
                default:
                    whereClause += `${whereClause.length > 0 ? " AND " : " WHERE "}${key} = ${value}`;
                    break;
            }
        }
    
        logQuery += whereClause;
        logQuery += " ORDER BY id DESC";
        logQuery += limitClause.length > 0 ? limitClause : " LIMIT 5000";
        logQuery += ";";
    
        return logQuery;
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

        this.samPool = mysql.createPool({  // setup second pool
            user: config.MYSQL_USER,
            password: config.MYSQL_PASS,
            host: config.MYSQL_HOST,
            port: parseInt(config.MYSQL_PORT),
            database: config.MYSQL_SAM_DB  // using the SAM DB
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
            const logQuery = this.buildQuery(args);
            const [rows] = await promisePool.query(logQuery);
            return rows as LogEntry[];
        } catch (err) {
            console.error("Error executing query, closing pool and creating a new one", err);
            await this.pool.end();
            
            this.setup().catch(error => {
                console.error("Error setting up connection pool: ", error);
            });
            const promisePool = this.pool.promise();
            const logQuery = this.buildQuery(args);
            const [rows] = await promisePool.query(logQuery);
            return rows as LogEntry[];
        }
    }
}