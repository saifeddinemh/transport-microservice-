import { transporterController } from "../controllers/transporterControllers";
import type { FastifyInstance } from "fastify";

export async function transporterRoutes(fastify: FastifyInstance) {
  /**
   * POST /transporters
   * create a new transporter
   * restricted to authenticated users with owner admin and manager roles
   */
  fastify.post("/", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyFarmOwnership,
    ],
    handler: transporterController.createTransporterHandler,
  });

  /**
   * GET /transporters
   * fetch a paginated list of transporters
   * public endpoint (no auth required)
   */
  fastify.get("/", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyFarmOwnership,
    ],
    handler: transporterController.getTransportersHandler,
  });

  /**
   * GET /transporters/:id
   * fetch a single transporter by id
   * public endpoint (no auth required)
   */
  fastify.get("/:id", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyTransporterOwnership,
    ],
    handler: transporterController.getTransporterByIdHandler,
  });

  /**
   * PATCH /transporters/:id
   * update an existing transporter
   * restricted to authenticated users with owner admin and manger roles
   */
  fastify.patch("/:id", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyTransporterOwnership,
    ],
    handler: transporterController.updateTransporterHandler,
  });

  /**
   * DELTE /transporters/:id
   * archive (soft delete) a transporter
   * restricted to authenticated users with owner admin and manger roles
   */
  fastify.delete("/:id", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyTransporterOwnership,
    ],
    handler: transporterController.archiveTransporterHandler,
  });
}
