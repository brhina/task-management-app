import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../server.js";

describe("Health Route Integration", () => {
  it("GET /health should return 200 with status ok and system metadata", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
    expect(res.body).toHaveProperty("timestamp");
    expect(res.body).toHaveProperty("uptime");
    expect(res.body).toHaveProperty("database");
    expect(res.body.database).toHaveProperty("status");
    expect(res.body).toHaveProperty("redis");
    expect(res.body.redis).toHaveProperty("connected");
  });
});
