import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";

// ── Hoisted controller mocks ──────────────────────────────────────────
const controller = vi.hoisted(() => ({
  createDriverHandler: vi.fn(async (_req: any, reply: any) => reply.send({ id: "drv-1" })),
  getDriversHandler: vi.fn(async (_req: any, reply: any) => reply.send({ data: [], total: 0 })),
  getDriverHandler: vi.fn(async (_req: any, reply: any) =>
    reply.send({ id: "drv-1", name: "John" })
  ),
  updateDriverHandler: vi.fn(async (_req: any, reply: any) => reply.send({ id: "drv-1" })),
  updateDriverStatusHandler: vi.fn(async (_req: any, reply: any) =>
    reply.send({ id: "drv-1", status: "AVAILABLE" })
  ),
  getDriverAssignmentsHandler: vi.fn(async (_req: any, reply: any) => reply.send({ data: [] })),
}));

vi.mock("../../controllers/driverControllers", () => ({
  driversController: controller,
}));

// ── Mock decorators ───────────────────────────────────────────────────
vi.mock("../../decorators/authenticate", () => ({
  default: async () => {},
}));

vi.mock("../../decorators/checkRole", () => ({
  default: () => async () => {},
}));

vi.mock("../../decorators/verifyFarmOwnership", () => ({
  default: async () => {},
}));

vi.mock("../../decorators/verifyDriverOwnership", () => ({
  default: async () => {},
}));

import { driversRoutes } from "../driverRoutes";

describe("driverRoutes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });

    app.decorate("authenticate", async () => {});
    app.decorate("checkRole", () => async () => {});
    app.decorate("verifyFarmOwnership", async () => {});
    app.decorate("verifyDriverOwnership", async () => {});

    await app.register(driversRoutes, { prefix: "/drivers" });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /drivers/", () => {
    it("should return 200 and call createDriverHandler", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/drivers/",
        payload: {
          name: "John",
          licenseNumber: "LIC123",
        },
      });

      expect(response.statusCode).toBe(200);
      expect(controller.createDriverHandler).toHaveBeenCalled();
    });
  });

  describe("GET /drivers/", () => {
    it("should return 200 and call getDriversHandler", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/drivers/",
      });

      expect(response.statusCode).toBe(200);
      expect(controller.getDriversHandler).toHaveBeenCalled();
    });
  });

  describe("GET /drivers/:id", () => {
    it("should return 200 and call getDriverHandler", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/drivers/drv-1",
      });

      expect(response.statusCode).toBe(200);
      expect(controller.getDriverHandler).toHaveBeenCalled();
    });
  });

  describe("PATCH /drivers/:id", () => {
    it("should return 200 and call updateDriverHandler", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/drivers/drv-1",
        payload: {
          name: "John Updated",
        },
      });

      expect(response.statusCode).toBe(200);
      expect(controller.updateDriverHandler).toHaveBeenCalled();
    });
  });

  describe("PATCH /drivers/:id/availability", () => {
    it("should return 200 and call updateDriverStatusHandler", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/drivers/drv-1/availability",
        payload: {
          status: "AVAILABLE",
        },
      });

      expect(response.statusCode).toBe(200);
      expect(controller.updateDriverStatusHandler).toHaveBeenCalled();
    });
  });

  describe("GET /drivers/:id/assignments", () => {
    it("should return 200 and call getDriverAssignmentsHandler", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/drivers/drv-1/assignments",
      });

      expect(response.statusCode).toBe(200);
      expect(controller.getDriverAssignmentsHandler).toHaveBeenCalled();
    });
  });
});
