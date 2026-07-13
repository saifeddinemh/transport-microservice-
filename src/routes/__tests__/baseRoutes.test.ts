import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { baseRoutes } from "../baseRoutes";

describe("baseRoutes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(baseRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /", () => {
    it("should return 200 and status ok", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/",
      });

      expect(response.statusCode).toBe(200);

      const body = response.json();
      expect(body).toHaveProperty("status", "ok");
      expect(body).toHaveProperty("message", "API is running");
    });
  });

  describe("GET /health", () => {
    it("should return 200 and healthy status", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/health",
      });

      expect(response.statusCode).toBe(200);

      const body = response.json();
      expect(body).toHaveProperty("status", "healthy");
      expect(body).toHaveProperty("timestamp");
      expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
    });
  });
});
