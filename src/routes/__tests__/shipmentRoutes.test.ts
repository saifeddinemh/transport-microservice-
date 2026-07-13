import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";

// ── Hoisted controller mocks ──────────────────────────────────────────
const controller = vi.hoisted(() => ({
  createShipmentHandler: vi.fn(async (_req: any, reply: any) => reply.send({ id: "ship-1" })),

  getShipmentsHandler: vi.fn(async (_req: any, reply: any) => reply.send({ data: [], total: 0 })),

  getShipmentHandler: vi.fn(async (_req: any, reply: any) => reply.send({ id: "ship-1" })),

  updateShipmentHandler: vi.fn(async (_req: any, reply: any) => reply.send({ id: "ship-1" })),

  updateShipmentStatusHandler: vi.fn(async (_req: any, reply: any) =>
    reply.send({ id: "ship-1", status: "IN_TRANSIT" })
  ),
}));

vi.mock("../../controllers/shipmentControllers", () => ({
  shipmentsController: controller,
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

vi.mock("../../decorators/verifyShipmentOwnership", () => ({
  default: async () => {},
}));

import { shipmentRoutes } from "../shipmentRoutes";

describe("shipmentRoutes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });

    app.decorate("authenticate", async () => {});
    app.decorate("checkRole", () => async () => {});
    app.decorate("verifyFarmOwnership", async () => {});
    app.decorate("verifyShipmentOwnership", async () => {});

    await app.register(shipmentRoutes, {
      prefix: "/shipments",
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("POST /shipments/", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/shipments/",
      payload: {
        status: "PENDING",
        startLocation: "Farm A",
        endLocation: "Warehouse B",
        totalWeight: 1000,
        totalCost: 500,
        estimatedArrival: "2026-07-10T00:00:00Z",
        farmId: "farm-1",
        requestId: "req-1",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(controller.createShipmentHandler).toHaveBeenCalled();
  });

  it("GET /shipments/", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/shipments/",
    });

    expect(response.statusCode).toBe(200);
    expect(controller.getShipmentsHandler).toHaveBeenCalled();
  });

  it("GET /shipments/:id", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/shipments/ship-1",
    });

    expect(response.statusCode).toBe(200);
    expect(controller.getShipmentHandler).toHaveBeenCalled();
  });

  it("PATCH /shipments/:id", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/shipments/ship-1",
      payload: {
        totalWeight: 1200,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(controller.updateShipmentHandler).toHaveBeenCalled();
  });

  it("PATCH /shipments/:id/status", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/shipments/ship-1/status",
      payload: {
        status: "IN_TRANSIT",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(controller.updateShipmentStatusHandler).toHaveBeenCalled();
  });
});
