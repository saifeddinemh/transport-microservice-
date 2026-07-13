import type { FastifyInstance } from "fastify";
import { transportationContractController } from "../controllers/transportationContractControllers";

/**
 * Transportation Contract routes plugin
 * Registered under: /api/contracts
 */
export async function contractRoutes(fastify: FastifyInstance) {
  /**
   * POST /
   * Create a new transportation contract
   * Requires authentication and ADMIN/MANAGER role
   */
  fastify.post("/", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyTransporterOwnership,
    ],
    handler: transportationContractController.createContractHandler,
  });

  /**
   * GET /
   * Get contract
   * Requires authentication
   */
  fastify.get("/", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyFarmOwnership,
    ],
    handler: transportationContractController.getContractsByTransporterHandler,
  });

  /**
   * GET /transporter/:transporterId
   * Get contracts for a SPECIFIC transporter
   */
  fastify.get("/transporter/:transporterId", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyTransporterOwnership,
    ],
    handler: transportationContractController.getContractsByTransporterHandler,
  });

  /**
   * GET /:id
   * Get contract by ID
   * Requires authentication
   */
  fastify.get("/:id", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyContractOwnership,
    ],
    handler: transportationContractController.getContractByIdHandler,
  });

  /**
   * PATCH /:id
   * Update an existing contract
   * Requires authentication and ADMIN/MANAGER role
   */
  fastify.patch("/:id", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyContractOwnership,
    ],
    handler: transportationContractController.updateContractHandler,
  });

  /**
   * DELETE /:id
   * Soft delete (archive) a contract
   * Requires authentication and ADMIN/MANAGER role
   */
  fastify.delete("/:id", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyContractOwnership,
    ],
    handler: transportationContractController.archiveContractHandler,
  });
}
