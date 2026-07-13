import type { FastifyRequest, FastifyReply } from "fastify";
import { employeeServices } from "../services/employeeServices";

import type { createEmployeeBody, filterEmployeeInput } from "../schemas/employeeSchemas";
import { ServerErrors } from "../utils/serverErrors";

export const employeeController = {
  async createEmployeeHandler(
    request: FastifyRequest<{ Body: createEmployeeBody }>,
    reply: FastifyReply
  ) {
    try {
      const newEmployee = await employeeServices.createEmployee(request.body);
      return reply.status(201).send(newEmployee);
    } catch (error) {
      if (error instanceof ServerErrors) {
        return reply
          .status(error.statusCode)
          .send({ message: error.message, details: error.details });
      }
      return reply.status(500).send({ message: "Internal Server Error" });
    }
  },

  async getFarmEmployeesHandler(
    request: FastifyRequest<{ Querystring: filterEmployeeInput }>,
    reply: FastifyReply
  ) {
    try {
      const employees = await employeeServices.getFarmEmployees(request.query);
      return reply.status(200).send(employees);
    } catch (error) {
      if (error instanceof ServerErrors) {
        return reply
          .status(error.statusCode)
          .send({ message: error.message, details: error.details });
      }
      return reply.status(500).send({ message: "Internal Server Error" });
    }
  },
};
