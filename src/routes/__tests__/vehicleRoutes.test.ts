import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";

// ── Hoisted controller mocks ──────────────────────────────────────────
const controller = vi.hoisted(() => ({
  createVehicleHandler: vi.fn(async (_req: any, reply: any) => reply.send({ id: "v-1" })),

  getVehiclesHandler: vi.fn(async (_req: any, reply: any) => reply.send({ data: [], total: 0 })),

  getVehicleHandler: vi.fn(async (_req: any, reply: any) =>
    reply.send({ id: "v-1", plateNumber: "ABC-123" })
  ),

  updateVehicleHandler: vi.fn(async (_req: any, reply: any) => reply.send({ id: "v-1" })),

  updateVehicleStatusHandler: vi.fn(async (_req: any, reply: any) =>
    reply.send({ id: "v-1", status: "AVAILABLE" })
  ),

  getVehicleMaintenanceHandler: vi.fn(async (_req: any, reply: any) => reply.send({ data: [] })),

  getVehicleFuelHandler: vi.fn(async (_req: any, reply: any) => reply.send({ data: [] })),
}));

vi.mock("../../controllers/vehicleControllers", () => ({
  vehiclesController: controller,
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

import { vehiclesRoutes } from "../vehicleRoutes";

describe("vehicleRoutes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });

    app.decorate("authenticate", async () => {});
    app.decorate("checkRole", () => async () => {});
    app.decorate("verifyFarmOwnership", async () => {});
    app.decorate("verifyVehicleOwnership", async () => {});

    await app.register(vehiclesRoutes, {
      prefix: "/vehicles",
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("POST /vehicles/", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/vehicles/",
      payload: {
        plateNumber: "ABC-123",
        type: "TRUCK",
        capacity: 5000,
        fuelType: "DIESEL",
        farmId: "farm-1",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(controller.createVehicleHandler).toHaveBeenCalled();
  });

  it("GET /vehicles/", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/vehicles/",
    });

    expect(response.statusCode).toBe(200);
    expect(controller.getVehiclesHandler).toHaveBeenCalled();
  });

  it("GET /vehicles/:id", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/vehicles/v-1",
    });

    expect(response.statusCode).toBe(200);
    expect(controller.getVehicleHandler).toHaveBeenCalled();
  });

  it("PATCH /vehicles/:id", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/vehicles/v-1",
      payload: {
        capacity: 6000,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(controller.updateVehicleHandler).toHaveBeenCalled();
  });

  it("PATCH /vehicles/:id/status", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/vehicles/v-1/status",
      payload: {
        status: "AVAILABLE",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(controller.updateVehicleStatusHandler).toHaveBeenCalled();
  });

  it("GET /vehicles/:id/maintenance", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/vehicles/v-1/maintenance",
    });

    expect(response.statusCode).toBe(200);
    expect(controller.getVehicleMaintenanceHandler).toHaveBeenCalled();
  });

  it("GET /vehicles/:id/fuel", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/vehicles/v-1/fuel",
    });

    expect(response.statusCode).toBe(200);
    expect(controller.getVehicleFuelHandler).toHaveBeenCalled();
  });
});
