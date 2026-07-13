import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";

// ── Hoisted controller mocks ──────────────────────────────────────────
const controller = vi.hoisted(() => ({
  createTransportRequestHandler: vi.fn(async (_req: any, reply: any) =>
    reply.send({ id: "trq-1" })
  ),

  getTransportRequestsHandler: vi.fn(async (_req: any, reply: any) =>
    reply.send({ data: [], total: 0 })
  ),

  getTransportRequestByIdHandler: vi.fn(async (_req: any, reply: any) =>
    reply.send({ id: "trq-1" })
  ),

  updateTransportRequestHandler: vi.fn(async (_req: any, reply: any) =>
    reply.send({ id: "trq-1" })
  ),

  updateTransportRequestStatusHandler: vi.fn(async (_req: any, reply: any) =>
    reply.send({ id: "trq-1", status: "APPROVED" })
  ),

  convertToInternalShipmentHandler: vi.fn(async (_req: any, reply: any) =>
    reply.send({ id: "ship-1" })
  ),

  convertToExternalShipmentHandler: vi.fn(async (_req: any, reply: any) =>
    reply.send({ id: "ship-2" })
  ),
}));

vi.mock("../../controllers/transportRequestControllers", () => ({
  transportRequestsController: controller,
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

vi.mock("../../decorators/verifyTransportRequestOwnership", () => ({
  default: async () => {},
}));

import { transportRequestsRoutes } from "../transportRequestRoutes";

describe("transportRequestRoutes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });

    app.decorate("authenticate", async () => {});
    app.decorate("checkRole", () => async () => {});
    app.decorate("verifyFarmOwnership", async () => {});
    app.decorate("verifyTransportRequestOwnership", async () => {});

    await app.register(transportRequestsRoutes, {
      prefix: "/transport-requests",
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("POST /transport-requests/", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/transport-requests/",
      payload: {
        requestedBy: "emp-1",
        source: "Farm A",
        destination: "Warehouse B",
        category: "CROPS",
        weight: 1000,
        requestDate: "2026-07-06",
        farmId: "farm-1",
        ownerId: "own-1",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(controller.createTransportRequestHandler).toHaveBeenCalled();
  });

  it("GET /transport-requests/", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/transport-requests/",
    });

    expect(response.statusCode).toBe(200);
    expect(controller.getTransportRequestsHandler).toHaveBeenCalled();
  });

  it("GET /transport-requests/:id", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/transport-requests/trq-1",
    });

    expect(response.statusCode).toBe(200);
    expect(controller.getTransportRequestByIdHandler).toHaveBeenCalled();
  });

  it("PATCH /transport-requests/:id", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/transport-requests/trq-1",
      payload: {
        weight: 1200,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(controller.updateTransportRequestHandler).toHaveBeenCalled();
  });

  it("PATCH /transport-requests/:id/status", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/transport-requests/trq-1/status",
      payload: {
        status: "APPROVED",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(controller.updateTransportRequestStatusHandler).toHaveBeenCalled();
  });

  it("POST /transport-requests/:id/convert-internal", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/transport-requests/trq-1/convert-internal",
    });

    expect(response.statusCode).toBe(200);
    expect(controller.convertToInternalShipmentHandler).toHaveBeenCalled();
  });

  it("POST /transport-requests/:id/convert-external", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/transport-requests/trq-1/convert-external",
    });

    expect(response.statusCode).toBe(200);
    expect(controller.convertToExternalShipmentHandler).toHaveBeenCalled();
  });
});
