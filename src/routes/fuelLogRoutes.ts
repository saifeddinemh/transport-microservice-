import type { FastifyInstance } from "fastify";
import { fuelLogsController } from "../controllers/fuelLogControllers";

/**
 * Fuel log routes registration
 * @param fastify - Fastify instance
 */
export function fuelLogsRoutes(fastify: FastifyInstance) {
  /**
   * CREATE operation: Create a new fuel log entry
   * Access: Authenticated managers/admins
   */
  fastify.post("/", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyVehicleOwnership,
    ],
    handler: fuelLogsController.createFuelLogHandler,
  });

  /**
   * READ operation: Get all fuel logs with filtering & pagination
   * Access: Authenticated managers/admins
   */
  fastify.get("/", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyFarmOwnership,
    ],
    handler: fuelLogsController.getFuelLogsHandler,
  });

  /**
   * READ operation: Get fuel logs for a specific vehicle
   * Access: Authenticated managers/admins
   */
  fastify.get("/vehicle/:vehicleId", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyVehicleOwnership,
    ],
    handler: fuelLogsController.getVehicleFuelHistoryHandler,
  });

  /**
   * READ operation: Get consumption statistics
   * Access: Authenticated managers/admins
   */
  fastify.get("/farms/:farmId/stats/consumption", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyFarmOwnership,
    ],
    handler: fuelLogsController.getConsumptionStatsHandler,
  });

  /**
   * READ operation: Get cost statistics
   * Access: Authenticated managers/admins
   */
  fastify.get("/farms/:farmId/stats/costs", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyFarmOwnership,
    ],
    handler: fuelLogsController.getCostStatsHandler,
  });

  /**
   * READ operation: Get a specific fuel log by ID
   * Access: Authenticated managers/admins
   */
  fastify.get("/:id", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyFuelLogOwnership,
    ],
    handler: fuelLogsController.getFuelLogHandler,
  });

  /**
   * UPDATE operation: Update a fuel log entry
   * Access: Authenticated managers/admins
   */
  fastify.patch("/:id", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyFuelLogOwnership,
    ],
    handler: fuelLogsController.updateFuelLogHandler,
  });
}
