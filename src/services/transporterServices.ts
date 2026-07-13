import { Prisma } from "@prisma/client";
import prisma from "../utils/prisma";
import type { TransporterModel } from "../models/transporterModels";
import { mapPrismaTransporterToModel } from "../models/transporterModels";
import type {
  CreateTransporterInput,
  UpdateTransporterInput,
  TransportersIdParamsInput,
  TransportersFilterQueryInput,
} from "../schemas/transporterSchemas";
import {
  createTransporterSchema,
  updateTransporterSchema,
  transportersFilterQuerySchema,
  TransportersIdParamsSchema,
} from "../schemas/transporterSchemas";
import { ServerErrors } from "../utils/serverErrors";
import { z } from "zod";

/**
 * Service module for managing transporters in the system.
 */
export const transporterServices = {
  /**
   * Creates a new transporter in the database.
   * @param data - Transporter creation input.
   * @returns The newly created transporter model.
   */
  async createTransporter(data: CreateTransporterInput): Promise<TransporterModel> {
    try {
      const validatedData = createTransporterSchema.parse(data);

      const newTransporter = await prisma.transport.create({
        data: validatedData,
      });

      return mapPrismaTransporterToModel(newTransporter);
    } catch (error) {
      if (error instanceof ServerErrors) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new ServerErrors("A transporter with this email already exists", 409, {
            field: "email",
            code: "DUPLICATE_EMAIL",
          });
        }
        if (error.code === "P2003") {
          throw new ServerErrors("Invalid Farm ID Provided", 400, {
            field: "farmId",
            code: "INVALID_FARM",
          });
        }
      }
      if (error instanceof z.ZodError) {
        throw new ServerErrors("Validation failed", 400, error.errors);
      }
      throw new ServerErrors("An unexpected error occurred", 500, error);
    }
  },

  /**
   * Retrieves a paginated list of transporters.
   * @param filters - Transporter filters object.
   * @returns Array of transporter models and total count.
   */
  async getTransporters(
    filters: TransportersFilterQueryInput
  ): Promise<{ data: TransporterModel[]; total: number }> {
    try {
      const validatedFilters = transportersFilterQuerySchema.parse(filters);

      const { searchTerm, status, farmId, page = 1, limit = 10 } = validatedFilters;

      const where: Prisma.TransportWhereInput = {
        ...(farmId && { farmId }),
      };

      if (status) {
        where.status = status;
      } else {
        where.status = { not: "INACTIVE" };
      }

      if (searchTerm) {
        where.OR = [
          { name: { contains: searchTerm, mode: "insensitive" } },
          { email: { contains: searchTerm, mode: "insensitive" } },
        ];
      }

      const total = await prisma.transport.count({ where });

      const items = await prisma.transport.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      });

      return {
        data: items.map(mapPrismaTransporterToModel),
        total,
      };
    } catch (error) {
      throw new ServerErrors("Failed to fetch transporters", 500, error);
    }
  },

  /**
   * Retrieves a single transporter by ID.
   * @param data - Transporter ID params.
   * @returns The transporter model or null if not found.
   */
  async getTransporterById(data: TransportersIdParamsInput): Promise<TransporterModel | null> {
    try {
      const parsedId = TransportersIdParamsSchema.safeParse(data);
      if (!parsedId.success) {
        throw new ServerErrors("Invalid transporter ID", 400, parsedId.error);
      }

      const transporter = await prisma.transport.findFirst({
        where: { id: data.id, status: { not: "INACTIVE" } },
      });

      return transporter ? mapPrismaTransporterToModel(transporter) : null;
    } catch (error) {
      if (error instanceof ServerErrors) throw error;
      throw new ServerErrors("An unexpected error occurred", 500, error);
    }
  },

  /**
   * Updates an existing transporter.
   * @param id - Transporter ID params.
   * @param data - Transporter update input.
   * @returns The updated transporter model.
   */
  async updateTransporter(
    id: TransportersIdParamsInput,
    data: UpdateTransporterInput
  ): Promise<TransporterModel> {
    try {
      const validatedData = updateTransporterSchema.parse(data);

      const existing = await prisma.transport.findFirst({
        where: { id: id.id, status: { not: "INACTIVE" } },
      });

      if (!existing) {
        throw new ServerErrors("Transporter not found", 404);
      }

      const updated = await prisma.transport.update({
        where: { id: id.id },
        data: validatedData,
      });

      return mapPrismaTransporterToModel(updated);
    } catch (error) {
      if (error instanceof ServerErrors) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new ServerErrors("Email already in use", 409, {
            field: "email",
            code: "DUPLICATE_EMAIL",
          });
        }
        if (error.code === "P2003") {
          throw new ServerErrors("Invalid farm ID", 400, {
            field: "farmId",
            code: "INVALID_FARM",
          });
        }
      }
      if (error instanceof z.ZodError) {
        throw new ServerErrors("Validation failed", 400, error.errors);
      }
      throw new ServerErrors("An unexpected error occurred", 500, error);
    }
  },

  /**
   * Soft deletes a transporter by marking status as INACTIVE.
   * @param id - Transporter ID params.
   * @returns The archived transporter model.
   */
  async archiveTransporter(id: TransportersIdParamsInput): Promise<TransporterModel> {
    try {
      const parsedId = TransportersIdParamsSchema.safeParse(id);
      if (!parsedId.success) {
        throw new ServerErrors("Invalid transporter ID", 400, parsedId.error);
      }

      const existing = await prisma.transport.findFirst({
        where: { id: id.id, status: { not: "INACTIVE" } },
      });

      if (!existing) {
        throw new ServerErrors("Transporter not found or already archived", 404);
      }

      const archived = await prisma.transport.update({
        where: { id: id.id },
        data: {
          status: "INACTIVE",
          isArchived: true, // Assuming you also want to flag your new isArchived boolean
        },
      });

      return mapPrismaTransporterToModel(archived);
    } catch (error) {
      if (error instanceof ServerErrors) throw error;
      throw new ServerErrors("Failed to archive transporter", 500, error);
    }
  },
};
