import { Request, Response } from "express";
import redisClient from "../util/redis";
import { database } from "../app";
import { checkUserRank } from "../util/authUtils";

const WHITELIST_KEY = "whitelisted_steamids";

async function isAuthorizedUser(user: Express.User): Promise<boolean> {
	const result = await checkUserRank(user.id);
	return result.isAuthorized;
}

export const getWhitelistPage = async (req: Request, res: Response): Promise<void> => {
	const steamIds = await redisClient.smembers(WHITELIST_KEY);
	const users = [];

	for (const id of steamIds) {
		const user = await database.getUser(id); // Assuming getUser exists to fetch by SteamID
		if (user) {
			users.push(user);
		}
	}

	const authorized = await isAuthorizedUser(req.user);

	res.render("whitelist", {
		user: req.user,
		users,
		isAuthorizedUser: authorized
	});
};

export const addToWhitelist = async (req: Request, res: Response): Promise<void> => {
	if (!await isAuthorizedUser(req.user)) {
		return res.status(403).send("Forbidden");
	}

	const steamId = req.body.steamid?.trim();
	if (!steamId) {
		return res.redirect("/whitelist");
	}

	await redisClient.sadd(WHITELIST_KEY, steamId);
	res.redirect("/whitelist");
};

export const removeFromWhitelist = async (req: Request, res: Response): Promise<void> => {
	if (!await isAuthorizedUser(req.user)) {
		return res.status(403).send("Forbidden");
	}

	const steamId = req.body.steamid?.trim();
	if (!steamId) {
		return res.redirect("/whitelist");
	}

	await redisClient.srem(WHITELIST_KEY, steamId);
	res.redirect("/whitelist");
};