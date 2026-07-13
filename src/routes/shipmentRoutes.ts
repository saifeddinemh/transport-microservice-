import type { FastifyInstance } from "fastify";
import { shipmentsController } from "../controllers/shipmentControllers";

export function shipmentRoutes(fastify: FastifyInstance) {
  fastify.post("/", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyFarmOwnership,
    ],
    handler: shipmentsController.createShipmentHandler,
  });

  fastify.get("/", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyFarmOwnership,
    ],
    handler: shipmentsController.getShipmentsHandler,
  });

  fastify.get("/:id", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyShipmentOwnership,
    ],
    handler: shipmentsController.getShipmentHandler,
  });

  fastify.patch("/:id", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyShipmentOwnership,
    ],
    handler: shipmentsController.updateShipmentHandler,
  });

  fastify.patch("/:id/status", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER", "WORKER"),
      fastify.verifyShipmentOwnership,
    ],
    handler: shipmentsController.updateShipmentStatusHandler,
  });
}
