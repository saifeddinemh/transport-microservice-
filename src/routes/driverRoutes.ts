import type { FastifyInstance } from "fastify";
import { driversController } from "../controllers/driverControllers";

/**
 * Driver routes registration
 * @param fastify - Fastify instance
 */
export function driversRoutes(fastify: FastifyInstance) {
  /**
   * CREATE operation: Register a new driver
   */
  fastify.post("/", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyFarmOwnership,
    ],
    handler: driversController.createDriverHandler,
  });

  /**
   * READ operation: Get all drivers (with filtering & pagination)
   */
  fastify.get("/", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyFarmOwnership,
    ],
    handler: driversController.getDriversHandler,
  });

  /**
   * READ operation: Get a specific driver by ID
   */
  fastify.get("/:id", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyDriverOwnership,
    ],
    handler: driversController.getDriverHandler,
  });

  /**
   * UPDATE operation: Modify driver information
   */
  fastify.patch("/:id", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyDriverOwnership,
    ],
    handler: driversController.updateDriverHandler,
  });

  /**
   * UPDATE operation: Update driver availability status
   */
  fastify.patch("/:id/availability", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyDriverOwnership,
    ],
    handler: driversController.updateDriverStatusHandler,
  });

  /**
   * READ operation: Get assigned missions for a driver
   */
  fastify.get("/:id/assignments", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyDriverOwnership,
    ],
    handler: driversController.getDriverAssignmentsHandler,
  });
}
