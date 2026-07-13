import type { FastifyInstance } from "fastify";
import { transportRequestsController } from "../controllers/transportRequestControllers";

/**
 * TransportRequest routes plugin
 * Registered under: /api/transport-requests
 * Security:
 * - All routes require authentication
 * - Status changes and conversions require OWNER, ADMIN, or MANAGER roles
 */
export async function transportRequestsRoutes(fastify: FastifyInstance) {
  /**
   * POST /
   * Create a new transport request
   * Requires authentication
   */
  fastify.post("/", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyFarmOwnership,
    ],
    handler: transportRequestsController.createTransportRequestHandler,
  });

  /**
   * GET /
   * List all transport requests with filtering and pagination
   * Requires authentication
   * Query params: page, limit, status, category, farmId, ownerId
   */
  fastify.get("/", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyFarmOwnership,
    ],
    handler: transportRequestsController.getTransportRequestsHandler,
  });

  /**
   * GET /:id
   * Get a specific transport request by ID
   * Requires authentication
   */
  fastify.get("/:id", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyTransportRequestOwnership,
    ],
    handler: transportRequestsController.getTransportRequestByIdHandler,
  });

  /**
   * PATCH /:id
   * Update a transport request
   * Requires authentication
   */
  fastify.patch("/:id", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyTransportRequestOwnership,
    ],
    handler: transportRequestsController.updateTransportRequestHandler,
  });

  /**
   * PATCH /:id/status
   * Update transport request status (approval workflow)
   * Requires OWNER, ADMIN, or MANAGER role
   */
  fastify.patch("/:id/status", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyTransportRequestOwnership,
    ],
    handler: transportRequestsController.updateTransportRequestStatusHandler,
  });

  /**
   * POST /:id/convert-internal
   * Convert transport request to INTERNAL shipment
   * Uses own farm's vehicles and drivers
   * Requires OWNER, ADMIN, or MANAGER role
   */
  fastify.post("/:id/convert-internal", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyTransportRequestOwnership,
    ],
    handler: transportRequestsController.convertToInternalShipmentHandler,
  });

  /**
   * POST /:id/convert-external
   * Convert transport request to EXTERNAL shipment
   * Uses external transport company
   * Requires OWNER, ADMIN, or MANAGER role
   */
  fastify.post("/:id/convert-external", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyTransportRequestOwnership,
    ],
    handler: transportRequestsController.convertToExternalShipmentHandler,
  });
}
