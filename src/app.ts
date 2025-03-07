import express from "express";
import rateLimit from "express-rate-limit";
import compression from "compression";
import bodyParser from "body-parser";
import lusca from "lusca";
import path from "path";
import cors from "cors";
import passport from "passport";
import session from "express-session";
import RedisStore from "connect-redis";

// Controllers (route handlers)
import * as homeController from "./controllers/home";
import * as authController from "./controllers/auth";
import * as userController from "./controllers/user";
import * as panelController from "./controllers/panel";

// API keys and Passport configuration
import * as passportConfig from "./config/passport";

import * as config from "./util/secrets";
import { MySqlDatabase } from "./util/database";
import redisClient from "./util/redis";
import { requireAuthorization } from "./util/authUtils";

// Create Express server
const app = express();

// Initialize store
const redisStore = new RedisStore({
    client: redisClient,
    prefix: "helix-logs:",
});

// Express configuration
app.set("port", process.env.PORT || 3000);
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "ejs");
app.use(compression());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    store: redisStore,
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true only in production with HTTPS
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    },
    rolling: true // Resets the cookie maxAge on every response
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(lusca.xframe("SAMEORIGIN"));
app.use(lusca.xssProtection(true));
app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});

app.use(
    express.static(path.join(__dirname, "public"), { maxAge: 31557600000 })
);

export let database: MySqlDatabase;

if (config.DATABASE == "mysql") {
    database = new MySqlDatabase();  // setup() gets called automatically
} else {
    throw new Error("Unknown database type: " + config.DATABASE);
}

/**
 * Rate limiters to prevent brute force attacks.
 */
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again after 15 minutes"
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 5, // start blocking after 5 requests
    message: "Too many accounts created from this IP, please try again after an hour"
});

/**
 * Primary app routes.
 */
app.get("/", homeController.index, limiter);
app.get("/account", passportConfig.ensureAuthenticated, userController.account, limiter);
app.get("/logout", userController.logout, authLimiter);
app.get("/panel", passportConfig.ensureAuthenticated, requireAuthorization, panelController.index, limiter);
app.get("/panel/context/:logId", passportConfig.ensureAuthenticated, requireAuthorization, panelController.getLogContext, limiter);
app.get("/download-logs", passportConfig.ensureAuthenticated, requireAuthorization, panelController.downloadLogs, authLimiter);
app.get("/ticket-statistics", passportConfig.ensureAuthenticated, requireAuthorization, panelController.ticketStatistics, limiter);

/**
 * Steam sign in.
 */
app.get("/auth/steam", authController.passportAuth, passportConfig.ensureAuthenticated, authLimiter);

app.get("/auth/steam/return",
    function (req, res, next) {
        req.url = req.originalUrl;
        next();
    },
    passport.authenticate("steam", { failureRedirect: "/" }),
    async function (req, res) {
        try {
            await authController.postLogin(req);
            // Save the session explicitly after setting rank
            req.session.save((err) => {
                if (err) {
                    console.error("Failed to save session:", err);
                }
                res.redirect("/");
            });
        } catch (error) {
            console.error("Authentication error:", error);
            res.redirect("/");
        }
    }
);

export default app;
