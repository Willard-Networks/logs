import { NextFunction, Request, Response } from "express";
import passport from "passport";
import passportSteam from "passport-steam";
import { WEBSITE_DOMAIN, STEAM_KEY } from "../util/secrets";

interface SteamProfile {
    provider: "steam";
    _json: {
        steamid: string;
        communityvisibilitystate: number;
        profilestate: number;
        personaname: string;
        commentpermission: number;
        profileurl: string;
        avatar: string;
        avatarmedium: string;
        avatarfull: string;
        avatarhash: string;
        lastlogoff: number;
        personastate: number;
        realname: string;
        primaryclanid: string;
        timecreated: number;
        personastateflags: number;
        loccountrycode: string;
        locstatecode: string;
    };
    id: string;
    displayName: string;
    photos: Array<{ value: string }>;
    identifier?: string;
}

interface SerializedUser {
    id: string;
    displayName: string;
    avatar: string;
    photos: Array<{ value: string }>;
}

const SteamStrategy = passportSteam.Strategy;
export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction): void => {
    if (req.isAuthenticated()) { return next(); }
    res.redirect("/");
};

passport.serializeUser((user: Express.User, done): void => {
    const steamUser = user as SteamProfile;
    // Include photos in serialized user data
    const serializedUser: SerializedUser = {
        id: steamUser.id,
        displayName: steamUser.displayName,
        avatar: steamUser._json.avatar,
        photos: steamUser.photos || [{ value: steamUser._json.avatar }] // Fallback to avatar if photos not available
    };
    done(null, serializedUser);
});

passport.deserializeUser((serializedUser: SerializedUser, done: (arg0: null, arg1: unknown) => void): void => {
    // Return the serialized user directly since it contains all needed data
    done(null, serializedUser);
});

passport.use(new SteamStrategy({
    returnURL: `${WEBSITE_DOMAIN}/auth/steam/return`,
    realm: WEBSITE_DOMAIN,
    apiKey: STEAM_KEY
}, (identifier: string, profile: SteamProfile, done: (error: any, user?: any) => void): void => {
    process.nextTick(() => {
        // Ensure photos array exists
        if (!profile.photos) {
            profile.photos = [{ value: profile._json.avatar }];
        }
        profile.identifier = identifier;
        return done(null, profile);
    });
}));
