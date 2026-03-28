/// <reference types="vitest/globals" />

import request from "supertest";
import { createApp } from "../src/app";

describe("API smoke tests", () => {
  const app = createApp();

  it("GET / should return service alive payload", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      message: "be-english-ai is running",
    });
  });

  it("GET /api/auth/health should return healthy status", async () => {
    const response = await request(app).get("/api/auth/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("healthy");
  });

  it("GET /api/admin/dashboard should require authentication", async () => {
    const response = await request(app).get("/api/admin/dashboard");

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      code: "AUTH_REQUIRED",
    });
  });

  it("GET /api/user-management/users should require authentication", async () => {
    const response = await request(app).get("/api/user-management/users");

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      code: "AUTH_REQUIRED",
    });
  });
});
