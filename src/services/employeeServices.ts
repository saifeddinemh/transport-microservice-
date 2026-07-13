import prisma from "../utils/prisma";
import type { Status } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import type { createEmployeeBody, filterEmployeeInput } from "../schemas/employeeSchemas";
import { createEmployeeSchema, filterEmployeeSchema } from "../schemas/employeeSchemas";
import type { EmployeeModel } from "../models/employeeModels";
import { mapPrismaEmployeeToModel } from "../models/employeeModels";
import { ServerErrors } from "../utils/serverErrors";

/**
 * Service module for managing employee requests in the system.
 */
export const employeeServices = {
  /**
   * Registers a new employee in the database.
   * @param data - Employee registration input.
   * @returns The newly created employee model.
   */

  async createEmployee(data: createEmployeeBody): Promise<EmployeeModel> {
    try {
      const validatedData = createEmployeeSchema.parse(data);

      const farm = await prisma.farm.findUnique({
        where: { id: validatedData.farmId },
      });

      if (!farm) {
        throw new ServerErrors("Farm not found", 404);
      }

      const employee = await prisma.employee.create({
        data: validatedData,
      });

      return mapPrismaEmployeeToModel(employee);
    } catch (err) {
      if (err instanceof ServerErrors) {
        throw err;
      }

      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ServerErrors(
          "An employee already exists with the given email, CNSS or identity.",
          409
        );
      }

      if (err instanceof z.ZodError) {
        throw new ServerErrors("Validation failed", 400, err.errors);
      }

      throw new ServerErrors("An unexpected error occurred", 500, err);
    }
  },

  /**
   * Get all employees in the database.
   * @param query - optional input for if you get Employees by filters(status, date...).
   * @returns array of employee model or null.
   */

  async getFarmEmployees(
    query: filterEmployeeInput
  ): Promise<{ employees: EmployeeModel[]; total: number } | null> {
    try {
      const filters = filterEmployeeSchema.parse(query);
      const { farmId, page, limit, status } = filters;

      if (!farmId) {
        throw new ServerErrors("Farm ID is required", 400);
      }

      const where: Prisma.EmployeeWhereInput = {
        farmId,
        ...(status && { status: status as Status }),
      };

      const total = await prisma.employee.count({ where });

      const employees = await prisma.employee.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      });

      return {
        employees: employees.map(mapPrismaEmployeeToModel),
        total,
      };
    } catch (error) {
      if (error instanceof ServerErrors) {
        throw error;
      }

      throw new ServerErrors("Failed to fetch employees", 500, error);
    }
  },
};
