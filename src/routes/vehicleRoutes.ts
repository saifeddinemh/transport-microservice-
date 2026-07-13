import type { FastifyInstance } from "fastify";
import { vehiclesController } from "../controllers/vehicleControllers";

/**
 * Vehicle routes registration
 * @param fastify - Fastify instance
 */
export function vehiclesRoutes(fastify: FastifyInstance) {
  /**
   * CREATE operation: Create a new vehicle
   */
  fastify.post("/", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyFarmOwnership,
    ],
    handler: vehiclesController.createVehicleHandler,
  });

  /**
   * READ operation: Get all vehicles (with filtering & pagination)
   */
  fastify.get("/", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyFarmOwnership,
    ],
    handler: vehiclesController.getVehiclesHandler,
  });

  /**
   * READ operation: Get a specific vehicle by ID
   *
   */
  fastify.get("/:id", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyVehicleOwnership,
    ],
    handler: vehiclesController.getVehicleHandler,
  });

  /**
   * UPDATE operation: Modify vehicle details
   *
   */
  fastify.patch("/:id", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyVehicleOwnership,
    ],
    handler: vehiclesController.updateVehicleHandler,
  });

  /**
   * UPDATE operation: Update vehicle availability status
   *
   */
  fastify.patch("/:id/status", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyVehicleOwnership,
    ],
    handler: vehiclesController.updateVehicleStatusHandler,
  });

  /**
   * READ operation: Get vehicle maintenance history
   *
   */
  fastify.get("/:id/maintenance", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyVehicleOwnership,
    ],
    handler: vehiclesController.getVehicleMaintenanceHandler,
  });

  /**
   * READ operation: Get vehicle fuel consumption history
   *
   */
  fastify.get("/:id/fuel", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyVehicleOwnership,
    ],
    handler: vehiclesController.getVehicleFuelHandler,
  });
}
