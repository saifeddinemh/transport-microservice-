import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";

// ── Hoisted controller mocks ──────────────────────────────────────────
const controller = vi.hoisted(() => ({
  createEmployeeHandler: vi.fn(async (_req: any, reply: any) => {
    return reply.send({ id: "emp-1" });
  }),

  getFarmEmployeesHandler: vi.fn(async (_req: any, reply: any) => {
    return reply.send({ data: [], total: 0 });
  }),
}));

vi.mock("../../controllers/employeeControllers", () => ({
  employeeController: controller,
}));

// ── Mock decorators ──────────────────────────────────────────────────
vi.mock("../../decorators/authenticate", () => ({
  default: async () => {},
}));

vi.mock("../../decorators/checkRole", () => ({
  default: () => async () => {},
}));

vi.mock("../../decorators/verifyFarmOwnership", () => ({
  default: async () => {},
}));

import { employeeRoutes } from "../employeeRoutes";

describe("employeeRoutes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });

    app.decorate("authenticate", async () => {});
    app.decorate("checkRole", () => async () => {});
    app.decorate("verifyFarmOwnership", async () => {});

    await app.register(employeeRoutes, {
      prefix: "/employees",
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /employees/", () => {
    it("should return 200 and call createEmployeeHandler", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/employees/",
        payload: {
          firstName: "John",
          lastName: "Doe",
          email: "john@test.com",
        },
      });

      expect(response.statusCode).toBe(200);
      expect(controller.createEmployeeHandler).toHaveBeenCalled();
    });
  });

  describe("GET /employees/", () => {
    it("should return 200 and call getFarmEmployeesHandler", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/employees/",
      });

      expect(response.statusCode).toBe(200);
      expect(controller.getFarmEmployeesHandler).toHaveBeenCalled();
    });
  });
});
