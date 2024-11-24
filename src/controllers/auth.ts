import {NextFunction, Request, Response} from "express";
import passport from "passport";
import {database} from "../app";
import "../config/passport";

export const passportAuth = passport.authenticate("steam", { failureRedirect: "/" });
export const keepOriginal = (req: Request, _res: Response, next: NextFunction): void => {
  req.url = req.originalUrl;
  next();
};

export const postLogin = async(req: Request): Promise<void> => {
  if (!req.session) {
    throw new Error("No session found");
  }
  
  if (!req.user) {
    throw new Error("No user found in request");
  }

  try {
    const rank = await database.getRank(req.user.id);
    req.session.rank = rank;
    
    // Touch the session to ensure it's saved
    req.session.touch();
  } catch (error) {
    console.error("Failed to get user rank:", error);
    req.session.rank = null;
    throw error;
  }
};
