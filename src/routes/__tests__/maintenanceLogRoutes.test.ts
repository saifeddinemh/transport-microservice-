import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";

// ── Hoisted controller mocks ──────────────────────────────────────────
const controller = vi.hoisted(() => ({
  createMaintenanceLogHandler: vi.fn(async (_req: any, reply: any) => reply.send({ id: "ml-1" })),

  getMaintenanceLogByIdHandler: vi.fn(async (_req: any, reply: any) => reply.send({ id: "ml-1" })),

  getVehicleMaintenanceHistoryHandler: vi.fn(async (_req: any, reply: any) =>
    reply.send({ data: [] })
  ),

  getMaintenanceStatsHandler: vi.fn(async (_req: any, reply: any) => reply.send({ total: 5 })),

  updateMaintenanceLogHandler: vi.fn(async (_req: any, reply: any) => reply.send({ id: "ml-1" })),
}));

vi.mock("../../controllers/maintenanceLogControllers", () => ({
  maintenanceLogController: controller,
}));

// ── Mock decorators ──────────────────────────────────────────────────
vi.mock("../../decorators/authenticate", () => ({
  default: async () => {},
}));

vi.mock("../../decorators/checkRole", () => ({
  default: () => async () => {},
}));

vi.mock("../../decorators/verifyVehicleOwnership", () => ({
  default: async () => {},
}));

vi.mock("../../decorators/verifyMaintenanceLogOwnership", () => ({
  default: async () => {},
}));

vi.mock("../../decorators/verifyFarmOwnership", () => ({
  default: async () => {},
}));

import { maintenanceLogsRoutes } from "../maintenanceLogRoutes";

describe("maintenanceLogRoutes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });

    app.decorate("authenticate", async () => {});
    app.decorate("checkRole", () => async () => {});
    app.decorate("verifyVehicleOwnership", async () => {});
    app.decorate("verifyMaintenanceLogOwnership", async () => {});
    app.decorate("verifyFarmOwnership", async () => {});

    await app.register(maintenanceLogsRoutes, {
      prefix: "/maintenance-logs",
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("POST /maintenance-logs/", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/maintenance-logs/",
      payload: {
        maintenanceType: "OIL_CHANGE",
        cost: 100,
        vehicleId: "v-1",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(controller.createMaintenanceLogHandler).toHaveBeenCalled();
  });

  it("GET /maintenance-logs/:id", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/maintenance-logs/ml-1",
    });

    expect(response.statusCode).toBe(200);
    expect(controller.getMaintenanceLogByIdHandler).toHaveBeenCalled();
  });

  it("GET /maintenance-logs/vehicle/:vehicleId", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/maintenance-logs/vehicle/v-1",
    });

    expect(response.statusCode).toBe(200);
    expect(controller.getVehicleMaintenanceHistoryHandler).toHaveBeenCalled();
  });

  it("GET /maintenance-logs/stats", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/maintenance-logs/stats",
    });

    expect(response.statusCode).toBe(200);
    expect(controller.getMaintenanceStatsHandler).toHaveBeenCalled();
  });

  it("PATCH /maintenance-logs/:id", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/maintenance-logs/ml-1",
      payload: {
        cost: 150,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(controller.updateMaintenanceLogHandler).toHaveBeenCalled();
  });
});
