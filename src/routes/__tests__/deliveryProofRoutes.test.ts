import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";

// ── Hoisted controller mocks ──────────────────────────────────────────
const controller = vi.hoisted(() => ({
  createPresignedUploadUrlHandler: vi.fn(async (_req: any, reply: any) => {
    return reply.send({ url: "https://presigned-url.test" });
  }),

  createDeliveryProofHandler: vi.fn(async (_req: any, reply: any) => {
    return reply.send({ id: "dp-1" });
  }),

  getDeliveryProofByIdHandler: vi.fn(async (_req: any, reply: any) => {
    return reply.send({ id: "dp-1", recipientName: "John" });
  }),

  listDeliveryProofsByShipmentHandler: vi.fn(async (_req: any, reply: any) => {
    return reply.send({ data: [], total: 0 });
  }),

  updateDeliveryProofHandler: vi.fn(async (_req: any, reply: any) => {
    return reply.send({ id: "dp-1", isValid: false });
  }),
}));

vi.mock("../../controllers/deliveryProofControllers", () => ({
  deliveryProofController: controller,
}));

// ── Mock decorators ──────────────────────────────────────────────────
vi.mock("../../decorators/authenticate", () => ({
  default: async () => {},
}));

vi.mock("../../decorators/checkRole", () => ({
  default: () => async () => {},
}));

vi.mock("../../decorators/verifyShipmentOwnership", () => ({
  default: async () => {},
}));

vi.mock("../../decorators/verifyDeliveryProofOwnership", () => ({
  default: async () => {},
}));

import { deliveryProofRoutes } from "../deliveryProofRoutes";

describe("deliveryProofRoutes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });

    app.decorate("authenticate", async () => {});
    app.decorate("checkRole", () => async () => {});
    app.decorate("verifyShipmentOwnership", async () => {});
    app.decorate("verifyDeliveryProofOwnership", async () => {});

    await app.register(deliveryProofRoutes, {
      prefix: "/delivery-proofs",
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("POST /delivery-proofs/uploads/presign", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/delivery-proofs/uploads/presign",
      payload: {
        fileName: "test.jpg",
        contentType: "image/jpeg",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(controller.createPresignedUploadUrlHandler).toHaveBeenCalled();
  });

  it("POST /delivery-proofs/", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/delivery-proofs/",
      payload: {
        shipmentId: "ship-1",
        recipientName: "John",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(controller.createDeliveryProofHandler).toHaveBeenCalled();
  });

  it("GET /delivery-proofs/:id", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/delivery-proofs/dp-1",
    });

    expect(response.statusCode).toBe(200);
    expect(controller.getDeliveryProofByIdHandler).toHaveBeenCalled();
  });

  it("GET /delivery-proofs/shipment/:shipmentId", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/delivery-proofs/shipment/ship-1",
    });

    expect(response.statusCode).toBe(200);
    expect(controller.listDeliveryProofsByShipmentHandler).toHaveBeenCalled();
  });

  it("PATCH /delivery-proofs/:id", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/delivery-proofs/dp-1",
      payload: {
        isValid: false,
        rejectionReason: "Invalid",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(controller.updateDeliveryProofHandler).toHaveBeenCalled();
  });
});
