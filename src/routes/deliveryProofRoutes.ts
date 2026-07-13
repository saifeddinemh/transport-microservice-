import type { FastifyInstance } from "fastify";
import { deliveryProofController } from "../controllers/deliveryProofControllers";

/**
 * Delivery Proof routes plugin
 * Registered under: /api/delivery-proofs
 */
export function deliveryProofRoutes(fastify: FastifyInstance) {
  /**
   * POST /uploads/presign
   * Generate a presigned URL for uploading delivery proof files
   * Requires: Authentication + OWNER/ADMIN/MANAGER role
   */
  fastify.post("/uploads/presign", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyShipmentOwnership,
    ],
    handler: deliveryProofController.createPresignedUploadUrlHandler,
  });

  /**
   * POST /
   * Create a new delivery proof record
   * Requires: Authentication + OWNER/ADMIN/MANAGER role
   */
  fastify.post("/", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyShipmentOwnership,
    ],
    handler: deliveryProofController.createDeliveryProofHandler,
  });

  /**
   * GET /:id
   * Get a single delivery proof by ID
   * Requires: Authentication + OWNER/ADMIN/MANAGER role
   */
  fastify.get("/:id", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyDeliveryProofOwnership,
    ],
    handler: deliveryProofController.getDeliveryProofByIdHandler,
  });

  /**
   * GET /shipment/:shipmentId
   * List all delivery proofs for a specific shipment (paginated)
   * Requires: Authentication + OWNER/ADMIN/MANAGER role
   */
  fastify.get("/shipment/:shipmentId", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyShipmentOwnership,
    ],
    handler: deliveryProofController.listDeliveryProofsByShipmentHandler,
  });

  /**
   * PATCH /:id
   * Update a delivery proof (for invalidation with reason)
   * Requires: Authentication + OWNER/ADMIN/MANAGER role
   */
  fastify.patch("/:id", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyDeliveryProofOwnership,
    ],
    handler: deliveryProofController.updateDeliveryProofHandler,
  });
}
