import request from "supertest";
import app from "../src/app";

describe("GET /auth/steam", () => {
    it("should return 302 Found for redirection", () => {
        return request(app).get("/auth/steam")
            .expect(302);
    });
});

describe("GET /auth/steam/return", () => {
    it("should return 302 Found for redirection", () => {
        return request(app).get("/auth/steam/return")
            .expect(302);
    });
});

describe("GET /account", () => {
    it("should return 302 Found for redirection", () => {
        return request(app).get("/account")
            .expect(302);
    });
});

describe("POST /logout", () => {
    it("should return 302 Found for redirection", () => {
        return request(app).post("/logout")
            .expect(302);
    });
});