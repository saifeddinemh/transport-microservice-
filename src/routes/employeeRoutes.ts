import type { FastifyInstance } from "fastify";
import { employeeController } from "../controllers/employeeControllers";

/**
 * Employee routes registration
 * @param fastify - Fastify instance
 */
export function employeeRoutes(fastify: FastifyInstance) {
  /**
   * CREATE operation: Register a new employee
   *
   * Access: Farm owners and administrators
   */
  fastify.post("/", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("ADMIN", "OWNER"),
      fastify.verifyFarmOwnership,
    ],
    handler: employeeController.createEmployeeHandler,
  });

  /**
   * READ operation: Get all employees for the authenticated owner's farm
   *
   * Access: Farm owners and administrators
   */
  fastify.get("/", {
    preHandler: [
      fastify.authenticate,
      fastify.checkRole("ADMIN", "OWNER"),
      fastify.verifyFarmOwnership,
    ],
    handler: employeeController.getFarmEmployeesHandler,
  });
}
