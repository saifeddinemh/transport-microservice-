import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";

// ── Hoisted controller mocks ──────────────────────────────────────────
const controller = vi.hoisted(() => ({
  createTransporterHandler: vi.fn(async (_req: any, reply: any) => reply.send({ id: "tr-1" })),

  getTransportersHandler: vi.fn(async (_req: any, reply: any) =>
    reply.send({ data: [], total: 0 })
  ),

  getTransporterByIdHandler: vi.fn(async (_req: any, reply: any) =>
    reply.send({ id: "tr-1", name: "Transporter A" })
  ),

  updateTransporterHandler: vi.fn(async (_req: any, reply: any) => reply.send({ id: "tr-1" })),

  archiveTransporterHandler: vi.fn(async (_req: any, reply: any) =>
    reply.send({ id: "tr-1", isArchived: true })
  ),
}));

vi.mock("../../controllers/transporterControllers", () => ({
  transporterController: controller,
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

vi.mock("../../decorators/verifyTransporterOwnership", () => ({
  default: async () => {},
}));

import { transporterRoutes } from "../transporterRoutes";

describe("transporterRoutes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });

    app.decorate("authenticate", async () => {});
    app.decorate("checkRole", () => async () => {});
    app.decorate("verifyFarmOwnership", async () => {});
    app.decorate("verifyTransporterOwnership", async () => {});

    await app.register(transporterRoutes, {
      prefix: "/transporters",
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("POST /transporters/", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/transporters/",
      payload: {
        name: "Transporter A",
        email: "trans@test.com",
        phoneNumber: "+1234567890",
        address: "123 Main St",
        farmId: "farm-1",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(controller.createTransporterHandler).toHaveBeenCalled();
  });

  it("GET /transporters/", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/transporters/",
    });

    expect(response.statusCode).toBe(200);
    expect(controller.getTransportersHandler).toHaveBeenCalled();
  });

  it("GET /transporters/:id", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/transporters/tr-1",
    });

    expect(response.statusCode).toBe(200);
    expect(controller.getTransporterByIdHandler).toHaveBeenCalled();
  });

  it("PATCH /transporters/:id", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/transporters/tr-1",
      payload: {
        name: "Updated Transporter",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(controller.updateTransporterHandler).toHaveBeenCalled();
  });

  it("DELETE /transporters/:id", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/transporters/tr-1",
    });

    expect(response.statusCode).toBe(200);
    expect(controller.archiveTransporterHandler).toHaveBeenCalled();
  });
});
