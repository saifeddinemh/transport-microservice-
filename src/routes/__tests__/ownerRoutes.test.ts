import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";

// ── Hoisted controller mocks ──────────────────────────────────────────
const controller = vi.hoisted(() => ({
  registerOwnerHandler: vi.fn(async (_req: any, reply: any) => {
    return reply.send({
      id: "own-1",
      token: "jwt-token",
    });
  }),

  loginOwnerHandler: vi.fn(async (_req: any, reply: any) => {
    return reply.send({
      token: "jwt-token",
    });
  }),
}));

vi.mock("../../controllers/ownerControllers", () => ({
  ownerController: controller,
}));

// ── Mock utils ────────────────────────────────────────────────────────
vi.mock("../../utils/validate", () => ({
  validate: () => async () => {},
}));

vi.mock("../../utils/Security", () => ({
  securityConfig: {
    authRateLimit: {
      max: 5,
      timeWindow: "1 minute",
    },
  },
}));

import { ownerRoutes } from "../ownerRoutes";

describe("ownerRoutes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });

    await app.register(ownerRoutes, {
      prefix: "/owner",
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /owner/register", () => {
    it("should return 200 and call registerOwnerHandler", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/owner/register",
        payload: {
          email: "test@example.com",
          password: "SecurePass123!",
          firstName: "John",
          lastName: "Doe",
          telephone: "+1234567890",
          birthDate: "1990-01-01",
        },
      });

      expect(response.statusCode).toBe(200);
      expect(controller.registerOwnerHandler).toHaveBeenCalledTimes(1);
    });

    it("should register the register route", () => {
      const routes = app.printRoutes();

      expect(routes).toContain("owner/");
      expect(routes).toContain("register (POST)");
    });
  });

  describe("POST /owner/login", () => {
    it("should return 200 and call loginOwnerHandler", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/owner/login",
        payload: {
          email: "test@example.com",
          password: "SecurePass123!",
        },
      });

      expect(response.statusCode).toBe(200);
      expect(controller.loginOwnerHandler).toHaveBeenCalledTimes(1);
    });

    it("should register the login route", () => {
      const routes = app.printRoutes();

      expect(routes).toContain("owner/");
      expect(routes).toContain("login (POST)");
    });
  });

  describe("Routes", () => {
    it("should register all owner routes", () => {
      const routes = app.printRoutes();

      expect(routes).toContain("owner/");
      expect(routes).toContain("register (POST)");
      expect(routes).toContain("login (POST)");
    });
  });
});
