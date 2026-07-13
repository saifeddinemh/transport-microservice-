import type { Prisma } from "@prisma/client";
import prisma from "../utils/prisma";
import type { MaintenanceLogModel } from "../models/maintenanceLogsModels";
import {
  mapPrismaMaintenanceLogToModel,
  mapNestedPrismaMaintenanceLogToModel,
} from "../models/maintenanceLogsModels";
import type {
  CreateMaintenanceLogInput,
  UpdateMaintenanceLogInput,
  MaintenanceLogsFilterQueryInput,
  MaintenanceLogsIdParamsInput,
  GetMaintenanceStatsQueryInput,
} from "../schemas/maintenanceLogSchemas";
import {
  createMaintenanceLogSchema,
  updateMaintenanceLogSchema,
  maintenanceLogsFilterQuerySchema,
  getMaintenanceStatsQuerySchema,
  MaintenanceLogsIdParamsSchema,
} from "../schemas/maintenanceLogSchemas";
import { ServerErrors } from "../utils/serverErrors";
import { z } from "zod";
import { transportEventProducer } from "../kafka/producers/transportEventProducer.js";
import { kafkaLogger } from "../kafka/logger.js";

/**
 * Service module for managing maintenance logs in the system.
 */
export const maintenanceLogServices = {
  /**
   * Creates a new maintenance log in the database.
   * @param data - Maintenance log creation input.
   * @returns The newly created maintenance log model.
   */
  async createMaintenanceLog(data: CreateMaintenanceLogInput): Promise<MaintenanceLogModel> {
    try {
      const validatedData = createMaintenanceLogSchema.parse(data);

      const vehicle = await prisma.vehicle.findUnique({
        where: { id: validatedData.vehicleId },
      });

      if (!vehicle) {
        throw new ServerErrors("Invalid vehicle identifier", 400, {
          field: "vehicleId",
          code: "INVALID_VEHICLE",
        });
      }

      const newLog = await prisma.maintenanceLog.create({
        data: validatedData,
      });

      transportEventProducer
        .publishMaintenanceLogRecorded({
          maintenanceLogId: newLog.id,
          vehicleId: newLog.vehicleId,
          maintenanceType: newLog.maintenanceType,
          cost: newLog.cost,
          date: newLog.date.toISOString(),
        })
        .catch((err) =>
          kafkaLogger.error("Failed to publish maintenanceLog.recorded", {
            maintenanceLogId: newLog.id,
            error: err instanceof Error ? err.message : String(err),
          })
        );

      return mapPrismaMaintenanceLogToModel(newLog);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ServerErrors("Validation failed", 400, error.errors);
      }
      if (error instanceof ServerErrors) {
        throw error;
      }
      throw new ServerErrors("An unexpected error occurred", 500, error);
    }
  },

  /**
   * Retrieves a maintenance log by ID.
   * @param data - Maintenance log ID params.
   * @returns The maintenance log model or null if not found.
   */
  async getMaintenanceLogById(
    data: MaintenanceLogsIdParamsInput
  ): Promise<MaintenanceLogModel | null> {
    try {
      const parsedId = MaintenanceLogsIdParamsSchema.safeParse(data);
      if (!parsedId.success) {
        throw new ServerErrors("Invalid maintenance log ID", 400, parsedId.error);
      }

      const log = await prisma.maintenanceLog.findUnique({
        where: { id: data.id },
        include: { vehicle: true },
      });

      return log ? mapNestedPrismaMaintenanceLogToModel(log) : null;
    } catch (error) {
      if (error instanceof ServerErrors) throw error;
      throw new ServerErrors("An unexpected error occurred", 500, error);
    }
  },

  /**
   * Retrieves paginated logs for a vehicle.
   * @param filters - Maintenance log filters.
   * @returns Array of maintenance log models and total count.
   */
  async getMaintenanceLogsByVehicle(
    filters: MaintenanceLogsFilterQueryInput
  ): Promise<{ data: MaintenanceLogModel[]; total: number }> {
    try {
      const validatedFilters = maintenanceLogsFilterQuerySchema.parse(filters);
      const {
        vehicleId,
        startDate,
        endDate,
        page = 1,
        limit = 10,
        nested = false,
      } = validatedFilters;

      const where: Prisma.MaintenanceLogWhereInput = {
        ...(vehicleId && { vehicleId }),
        ...(startDate || endDate
          ? {
              date: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            }
          : {}),
      };

      const total = await prisma.maintenanceLog.count({ where });

      const logs = await prisma.maintenanceLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: "desc" },
        include: { vehicle: true },
      });

      return {
        data: nested
          ? logs.map(mapNestedPrismaMaintenanceLogToModel)
          : logs.map(mapPrismaMaintenanceLogToModel),
        total,
      };
    } catch (error) {
      throw new ServerErrors("Failed to fetch maintenance logs", 500, error);
    }
  },

  /**
   * Gets stats for a vehicle (optionally filtered by yearMonth).
   * @param query - Stats query parameters.
   * @returns Stats object.
   */
  async getMaintenanceStats(query: GetMaintenanceStatsQueryInput) {
    try {
      const validatedQuery = getMaintenanceStatsQuerySchema.parse(query);
      const { vehicleId, yearMonth, farmId } = validatedQuery;

      const where: Prisma.MaintenanceLogWhereInput = {
        AND: [
          farmId ? { vehicle: { farmId } } : {},
          vehicleId ? { vehicleId } : {},
          yearMonth
            ? {
                date: {
                  gte: new Date(`${yearMonth}-01T00:00:00.000Z`),
                  lt: new Date(`${yearMonth}-31T23:59:59.999Z`),
                },
              }
            : {},
        ].filter((condition) => Object.keys(condition).length > 0),
      };

      const logs = await prisma.maintenanceLog.findMany({ where });
      const totalCost = logs.reduce((sum, log) => sum + log.cost, 0);
      const averageCost = logs.length ? totalCost / logs.length : 0;

      return {
        totalCost,
        averageCost,
        count: logs.length,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ServerErrors("Validation failed", 400, error.errors);
      }
      throw new ServerErrors("Error computing maintenance stats", 500, error);
    }
  },

  /**
   * Updates an existing maintenance log.
   * @param id - Maintenance log ID params.
   * @param data - Update input.
   * @returns The updated maintenance log model.
   */
  async updateMaintenanceLog(
    id: MaintenanceLogsIdParamsInput,
    data: UpdateMaintenanceLogInput
  ): Promise<MaintenanceLogModel> {
    try {
      const validatedData = updateMaintenanceLogSchema.parse(data);

      const existing = await prisma.maintenanceLog.findUnique({
        where: { id: id.id },
      });

      if (!existing) {
        throw new ServerErrors("Maintenance log not found", 404, { id: id.id });
      }

      const updated = await prisma.maintenanceLog.update({
        where: { id: id.id },
        data: validatedData,
      });

      return mapPrismaMaintenanceLogToModel(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ServerErrors("Validation failed", 400, error.errors);
      }
      if (error instanceof ServerErrors) throw error;
      throw new ServerErrors("Error updating maintenance log", 500, error);
    }
  },
};
