import request from "supertest";
import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import compression from "compression";
import ejs from "ejs";

// Exercise the supported Express 4 middleware/types without Redis, MySQL or Steam.
describe("updated runtime dependencies", () => {
    const app = express();
    app.use(compression());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.post("/body", (req: Request, res: Response) => res.json(req.body));
    app.get("/logs/:logId", (req: Request, res: Response) => {
        // Express 5 types widen this to string | string[] and break the app.
        const logId: string = req.params.logId;
        res.json({ logId });
    });
    app.get("/template", (_req: Request, res: Response) => {
        res.send(ejs.render("<p><%= message %></p>", { message: "<script>alert(1)</script>" }));
    });

    it("preserves Express 4 string route parameters", async () => {
        await request(app).get("/logs/123").expect(200, { logId: "123" });
    });

    it("parses nested URL-encoded form fields", async () => {
        await request(app).post("/body").type("form").send("filter[text]=hello&limit=25")
            .expect(200, { filter: { text: "hello" }, limit: "25" });
    });

    it("does not pollute object prototypes through form input", async () => {
        const response = await request(app).post("/body").type("form")
            .send("__proto__[polluted]=yes&constructor[prototype][polluted]=yes&text=safe");
        expect(response.status).toBe(200);
        expect(Object.prototype).not.toHaveProperty("polluted");
        expect(response.body.text).toBe("safe");
    });

    it("enforces the default JSON body size limit", async () => {
        await request(app).post("/body").send({ text: "x".repeat(110 * 1024) }).expect(413);
    });

    it("escapes template data rather than rendering markup", async () => {
        const response = await request(app).get("/template").expect(200);
        expect(response.text).toBe("<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
    });
});
