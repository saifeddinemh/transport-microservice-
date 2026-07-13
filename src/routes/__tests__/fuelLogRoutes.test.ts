import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";

// ── Hoisted controller mocks ──────────────────────────────────────────
const controller = vi.hoisted(() => ({
  createFuelLogHandler: vi.fn(async (_req: any, reply: any) => reply.send({ id: "fl-1" })),

  getFuelLogsHandler: vi.fn(async (_req: any, reply: any) => reply.send({ data: [], total: 0 })),

  getVehicleFuelHistoryHandler: vi.fn(async (_req: any, reply: any) => reply.send({ data: [] })),

  getConsumptionStatsHandler: vi.fn(async (_req: any, reply: any) => reply.send({ total: 100 })),

  getCostStatsHandler: vi.fn(async (_req: any, reply: any) => reply.send({ total: 500 })),

  getFuelLogHandler: vi.fn(async (_req: any, reply: any) => reply.send({ id: "fl-1" })),

  updateFuelLogHandler: vi.fn(async (_req: any, reply: any) => reply.send({ id: "fl-1" })),
}));

vi.mock("../../controllers/fuelLogControllers", () => ({
  fuelLogsController: controller,
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

vi.mock("../../decorators/verifyVehicleOwnership", () => ({
  default: async () => {},
}));

vi.mock("../../decorators/verifyFuelLogOwnership", () => ({
  default: async () => {},
}));

import { fuelLogsRoutes } from "../fuelLogRoutes";

describe("fuelLogRoutes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });

    app.decorate("authenticate", async () => {});
    app.decorate("checkRole", () => async () => {});
    app.decorate("verifyFarmOwnership", async () => {});
    app.decorate("verifyVehicleOwnership", async () => {});
    app.decorate("verifyFuelLogOwnership", async () => {});

    await app.register(fuelLogsRoutes, {
      prefix: "/fuel-logs",
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("POST /fuel-logs/", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/fuel-logs/",
      payload: {
        fuelType: "DIESEL",
        quantity: 50,
        cost: 100,
        vehicleId: "v-1",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(controller.createFuelLogHandler).toHaveBeenCalled();
  });

  it("GET /fuel-logs/", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/fuel-logs/",
    });

    expect(response.statusCode).toBe(200);
    expect(controller.getFuelLogsHandler).toHaveBeenCalled();
  });

  it("GET /fuel-logs/vehicle/:vehicleId", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/fuel-logs/vehicle/v-1",
    });

    expect(response.statusCode).toBe(200);
    expect(controller.getVehicleFuelHistoryHandler).toHaveBeenCalled();
  });

  it("GET /fuel-logs/farms/:farmId/stats/consumption", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/fuel-logs/farms/farm-1/stats/consumption",
    });

    expect(response.statusCode).toBe(200);
    expect(controller.getConsumptionStatsHandler).toHaveBeenCalled();
  });

  it("GET /fuel-logs/farms/:farmId/stats/costs", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/fuel-logs/farms/farm-1/stats/costs",
    });

    expect(response.statusCode).toBe(200);
    expect(controller.getCostStatsHandler).toHaveBeenCalled();
  });

  it("GET /fuel-logs/:id", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/fuel-logs/fl-1",
    });

    expect(response.statusCode).toBe(200);
    expect(controller.getFuelLogHandler).toHaveBeenCalled();
  });

  it("PATCH /fuel-logs/:id", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/fuel-logs/fl-1",
      payload: {
        quantity: 60,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(controller.updateFuelLogHandler).toHaveBeenCalled();
  });
});
