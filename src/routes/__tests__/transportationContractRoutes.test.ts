import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";

// ── Hoisted controller mocks ──────────────────────────────────────────
const controller = vi.hoisted(() => ({
  createContractHandler: vi.fn(async (_req: any, reply: any) => reply.send({ id: "tc-1" })),

  getContractsByTransporterHandler: vi.fn(async (_req: any, reply: any) =>
    reply.send({ data: [], total: 0 })
  ),

  getContractByIdHandler: vi.fn(async (_req: any, reply: any) => reply.send({ id: "tc-1" })),

  updateContractHandler: vi.fn(async (_req: any, reply: any) => reply.send({ id: "tc-1" })),

  archiveContractHandler: vi.fn(async (_req: any, reply: any) =>
    reply.send({ id: "tc-1", isArchived: true })
  ),
}));

vi.mock("../../controllers/transportationContractControllers", () => ({
  transportationContractController: controller,
}));

// ── Mock decorators ──────────────────────────────────────────────────
vi.mock("../../decorators/authenticate", () => ({
  default: async () => {},
}));

vi.mock("../../decorators/checkRole", () => ({
  default: () => async () => {},
}));

vi.mock("../../decorators/verifyTransporterOwnership", () => ({
  default: async () => {},
}));

vi.mock("../../decorators/verifyFarmOwnership", () => ({
  default: async () => {},
}));

vi.mock("../../decorators/verifyContractOwnership", () => ({
  default: async () => {},
}));

import { contractRoutes } from "../transportationContractRoutes";

describe("transportationContractRoutes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });

    app.decorate("authenticate", async () => {});
    app.decorate("checkRole", () => async () => {});
    app.decorate("verifyTransporterOwnership", async () => {});
    app.decorate("verifyFarmOwnership", async () => {});
    app.decorate("verifyContractOwnership", async () => {});

    await app.register(contractRoutes, {
      prefix: "/contracts",
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("POST /contracts/", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/contracts/",
      payload: {
        startDate: "2026-01-01",
        contractType: "PERMANENT",
        pricePerKm: 2.5,
        maxWeight: 5000,
        transportId: "trans-1",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(controller.createContractHandler).toHaveBeenCalled();
  });

  it("GET /contracts/", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/contracts/",
    });

    expect(response.statusCode).toBe(200);
    expect(controller.getContractsByTransporterHandler).toHaveBeenCalled();
  });

  it("GET /contracts/transporter/:transporterId", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/contracts/transporter/trans-1",
    });

    expect(response.statusCode).toBe(200);
    expect(controller.getContractsByTransporterHandler).toHaveBeenCalled();
  });

  it("GET /contracts/:id", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/contracts/tc-1",
    });

    expect(response.statusCode).toBe(200);
    expect(controller.getContractByIdHandler).toHaveBeenCalled();
  });

  it("PATCH /contracts/:id", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/contracts/tc-1",
      payload: {
        pricePerKm: 3.0,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(controller.updateContractHandler).toHaveBeenCalled();
  });

  it("DELETE /contracts/:id", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/contracts/tc-1",
    });

    expect(response.statusCode).toBe(200);
    expect(controller.archiveContractHandler).toHaveBeenCalled();
  });
});
