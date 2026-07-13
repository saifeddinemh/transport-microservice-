import type { FastifyInstance } from "fastify";
import { maintenanceLogController } from "../controllers/maintenanceLogControllers";

export function maintenanceLogsRoutes(fastify: FastifyInstance) {
  fastify.post("/", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyVehicleOwnership,
    ],
    handler: maintenanceLogController.createMaintenanceLogHandler,
  });

  fastify.get("/:id", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyMaintenanceLogOwnership,
    ],
    handler: maintenanceLogController.getMaintenanceLogByIdHandler,
  });

  fastify.get("/vehicle/:vehicleId", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyVehicleOwnership,
    ],
    handler: maintenanceLogController.getVehicleMaintenanceHistoryHandler,
  });

  fastify.get("/stats", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyFarmOwnership,
    ],
    handler: maintenanceLogController.getMaintenanceStatsHandler,
  });

  fastify.patch("/:id", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("OWNER", "ADMIN", "MANAGER"),
      fastify.verifyMaintenanceLogOwnership,
    ],
    handler: maintenanceLogController.updateMaintenanceLogHandler,
  });
}
