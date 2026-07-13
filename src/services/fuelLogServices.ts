import prisma from "../utils/prisma";
import { Prisma, FuelType } from "@prisma/client";
import type { FuelLogModel, ConsumptionStatsModel, CostStatsModel } from "../models/fuelLogsModels";
import { mapPrismaFuelLogToModel, mapNestedPrismaFuelLogToModel } from "../models/fuelLogsModels";
import type {
  CreateFuelLogInput,
  UpdateFuelLogInput,
  FuelLogIdParamsInput,
  FuelLogsFilterQueryInput,
  ConsumptionStatsQueryInput,
  CostStatsQueryInput,
} from "../schemas/fuelLogSchemas";
import { createFuelLogSchema, updateFuelLogSchema } from "../schemas/fuelLogSchemas";
import { ServerErrors } from "../utils/serverErrors";
import { z } from "zod";

/**
 * Service module for managing fuel logs in the system
 */
export const fuelLogsServices = {
  /**
   * Creates a new fuel log entry in the database
   */
  async createFuelLog(data: CreateFuelLogInput): Promise<FuelLogModel> {
    try {
      const validatedData = createFuelLogSchema.parse(data);

      const vehicle = await prisma.vehicle.findUnique({
        where: { id: validatedData.vehicleId },
        include: { farm: true },
      });

      if (!vehicle) {
        throw new ServerErrors("Vehicle not found", 404);
      }

      // Check odometer monotonicity
      const previousLog = await prisma.fuelLog.findFirst({
        where: { vehicleId: validatedData.vehicleId },
        orderBy: { date: "desc" },
      });

      if (previousLog && validatedData.odometerReading < previousLog.odometerReading) {
        throw new ServerErrors("Odometer reading cannot be less than previous reading", 400, {
          currentReading: validatedData.odometerReading,
          previousReading: previousLog.odometerReading,
        });
      }

      const fuelLog = await prisma.fuelLog.create({
        data: validatedData,
        include: { vehicle: true },
      });

      return mapPrismaFuelLogToModel(fuelLog);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ServerErrors("Validation failed", 400, error.errors);
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2003") {
          throw new ServerErrors("Vehicle not found", 404);
        }
      }
      if (error instanceof ServerErrors) {
        throw error;
      }
      throw new ServerErrors("Failed to create fuel log", 500, error);
    }
  },

  /**
   * Gets all fuel logs with filtering and pagination
   */
  async getFuelLogs(
    filters: FuelLogsFilterQueryInput
  ): Promise<{ fuelLogs: FuelLogModel[]; total: number }> {
    try {
      const {
        farmId,
        page = 1,
        limit = 10,
        vehicleId,
        fuelType,
        startDate,
        endDate,
        minQuantity,
        maxQuantity,
      } = filters;

      const where: Prisma.FuelLogWhereInput = {
        vehicle: {
          farmId: farmId || undefined,
        },
        ...(vehicleId && { vehicleId }),
        ...(fuelType && { fuelType }),
        ...(startDate || endDate
          ? {
              date: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            }
          : {}),
        ...(minQuantity !== undefined && { quantity: { gte: minQuantity } }),
        ...(maxQuantity !== undefined && { quantity: { lte: maxQuantity } }),
      };

      const total = await prisma.fuelLog.count({ where });

      const fuelLogs = await prisma.fuelLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: "desc" },
        include: { vehicle: true },
      });

      return {
        fuelLogs: fuelLogs.map(mapNestedPrismaFuelLogToModel),
        total,
      };
    } catch (error) {
      throw new ServerErrors("Failed to fetch fuel logs", 500, error);
    }
  },

  /**
   * Gets fuel logs for a specific vehicle
   */
  async getVehicleFuelHistory(
    _vehicleId: string,
    filters: Omit<FuelLogsFilterQueryInput, "_vehicleId">
  ): Promise<{ fuelLogs: FuelLogModel[]; total: number }> {
    try {
      const { page = 1, limit = 10, startDate, endDate } = filters;

      const where: Prisma.FuelLogWhereInput = {
        vehicleId: _vehicleId,
        ...(startDate || endDate
          ? {
              date: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            }
          : {}),
      };

      const total = await prisma.fuelLog.count({ where });

      const fuelLogs = await prisma.fuelLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: "desc" },
        include: { vehicle: true },
      });

      return {
        fuelLogs: fuelLogs.map(mapNestedPrismaFuelLogToModel),
        total,
      };
    } catch (error) {
      throw new ServerErrors("Failed to fetch vehicle fuel history", 500, error);
    }
  },

  /**
   * Updates a fuel log entry
   */
  async updateFuelLog(id: FuelLogIdParamsInput, data: UpdateFuelLogInput): Promise<FuelLogModel> {
    try {
      const validatedData = updateFuelLogSchema.parse(data);

      // Check odometer monotonicity if updating odometer
      if (validatedData.odometerReading !== undefined) {
        const currentLog = await prisma.fuelLog.findUnique({
          where: { id: id.id },
        });

        if (!currentLog) {
          throw new ServerErrors("Fuel log not found", 404);
        }

        const previousLog = await prisma.fuelLog.findFirst({
          where: {
            vehicleId: currentLog.vehicleId,
            date: { lt: currentLog.date },
          },
          orderBy: { date: "desc" },
        });

        const nextLog = await prisma.fuelLog.findFirst({
          where: {
            vehicleId: currentLog.vehicleId,
            date: { gt: currentLog.date },
          },
          orderBy: { date: "asc" },
        });

        if (previousLog && validatedData.odometerReading < previousLog.odometerReading) {
          throw new ServerErrors("Odometer reading cannot be less than previous reading", 400);
        }

        if (nextLog && validatedData.odometerReading > nextLog.odometerReading) {
          throw new ServerErrors("Odometer reading cannot be greater than next reading", 400);
        }
      }

      const updatedFuelLog = await prisma.fuelLog.update({
        where: id,
        data: validatedData,
        include: { vehicle: true },
      });

      return mapPrismaFuelLogToModel(updatedFuelLog);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new ServerErrors("Fuel log not found", 404);
        }
      }
      if (error instanceof z.ZodError) {
        throw new ServerErrors("Validation failed", 400, error.errors);
      }
      if (error instanceof ServerErrors) {
        throw error;
      }
      throw new ServerErrors("Failed to update fuel log", 500, error);
    }
  },

  /**
   * Gets fuel consumption statistics
   */
  async getConsumptionStats(
    filters: ConsumptionStatsQueryInput & { farmId: string }
  ): Promise<ConsumptionStatsModel> {
    try {
      const { vehicleId, startDate, endDate, period, farmId } = filters;

      const where: Prisma.FuelLogWhereInput = {
        vehicle: { farmId },
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

      const fuelLogs = await prisma.fuelLog.findMany({
        where,
        include: { vehicle: true },
        orderBy: { date: "asc" },
      });

      if (fuelLogs.length === 0) {
        return {
          totalLiters: 0,
          totalCost: 0,
          averageCostPerLiter: 0,
          averageConsumption: null,
          totalDistance: null,
          vehicleCount: 0,
          period,
        };
      }

      const totalLiters = fuelLogs.reduce((sum, log) => sum + log.quantity, 0);
      const totalCost = fuelLogs.reduce((sum, log) => sum + log.cost, 0);
      const averageCostPerLiter = totalCost / totalLiters;

      const vehicleStats = new Map<
        string,
        { firstOdometer: number; lastOdometer: number; totalLiters: number }
      >();

      fuelLogs.forEach((log) => {
        if (!vehicleStats.has(log.vehicleId)) {
          vehicleStats.set(log.vehicleId, {
            firstOdometer: log.odometerReading,
            lastOdometer: log.odometerReading,
            totalLiters: 0,
          });
        }
        const stats = vehicleStats.get(log.vehicleId)!;
        stats.lastOdometer = Math.max(stats.lastOdometer, log.odometerReading);
        stats.totalLiters += log.quantity;
      });

      let totalDistance = 0;
      let _totalConsumption = 0;
      let validVehicleCount = 0;

      vehicleStats.forEach((stats, _vehicleId) => {
        const distance = stats.lastOdometer - stats.firstOdometer;
        if (distance > 0 && stats.totalLiters > 0) {
          totalDistance += distance;
          _totalConsumption += stats.totalLiters / distance; // liters per km
          validVehicleCount++;
        }
      });

      const averageConsumption = validVehicleCount > 0 ? (totalLiters / totalDistance) * 100 : null;

      return {
        totalLiters,
        totalCost,
        averageCostPerLiter,
        averageConsumption,
        totalDistance: totalDistance > 0 ? totalDistance : null,
        vehicleCount: vehicleStats.size,
        period,
      };
    } catch (error) {
      throw new ServerErrors("Failed to generate consumption stats", 500, error);
    }
  },

  /**
   * Gets fuel cost statistics
   */
  async getCostStats(filters: CostStatsQueryInput & { farmId: string }): Promise<CostStatsModel> {
    try {
      const { vehicleId, startDate, endDate, groupBy, farmId } = filters;

      const where: Prisma.FuelLogWhereInput = {
        vehicle: { farmId },
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

      const fuelLogs = await prisma.fuelLog.findMany({
        where,
        include: { vehicle: true },
      });

      if (fuelLogs.length === 0) {
        return {
          period: groupBy,
          totalCost: 0,
          averageCostPerLiter: 0,
          vehicleCount: 0,
          fuelTypeBreakdown: [],
        };
      }

      // Calculate total metrics
      const totalLiters = fuelLogs.reduce((sum, log) => sum + log.quantity, 0);
      const totalCost = fuelLogs.reduce((sum, log) => sum + log.cost, 0);
      const averageCostPerLiter = totalLiters > 0 ? totalCost / totalLiters : 0;

      // Calculate fuel type breakdown
      const fuelTypeBreakdown = Object.values(FuelType)
        .map((fuelType) => {
          const typeLogs = fuelLogs.filter((log) => log.fuelType === fuelType);
          const typeLiters = typeLogs.reduce((sum, log) => sum + log.quantity, 0);
          const typeCost = typeLogs.reduce((sum, log) => sum + log.cost, 0);

          return {
            fuelType,
            totalLiters: typeLiters,
            totalCost: typeCost,
            averageCostPerLiter: typeLiters > 0 ? typeCost / typeLiters : 0,
          };
        })
        .filter((breakdown) => breakdown.totalLiters > 0);

      const vehicleCount = new Set(fuelLogs.map((log) => log.vehicleId)).size;

      return {
        period: groupBy,
        totalCost,
        averageCostPerLiter,
        vehicleCount,
        fuelTypeBreakdown,
      };
    } catch (error) {
      throw new ServerErrors("Failed to generate cost stats", 500, error);
    }
  },

  /**
   * Gets a fuel log by ID
   */
  async getFuelLogById(id: string): Promise<FuelLogModel | null> {
    try {
      const fuelLog = await prisma.fuelLog.findUnique({
        where: { id },
        include: { vehicle: true },
      });

      return fuelLog ? mapPrismaFuelLogToModel(fuelLog) : null;
    } catch (error) {
      throw new ServerErrors("Failed to fetch fuel log", 500, error);
    }
  },
};
