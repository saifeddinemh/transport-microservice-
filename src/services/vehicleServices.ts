import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";
import type { VehicleModel } from "../models/vehicleModels";
import { mapPrismaVehicleToModel, mapNestedPrismaVehicleToModel } from "../models/vehicleModels";
import type { FuelLogModel } from "../models/fuelLogsModels";
import { mapPrismaFuelLogToModel } from "../models/fuelLogsModels";
import type { MaintenanceLogModel } from "../models/maintenanceLogsModels";
import { mapPrismaMaintenanceLogToModel } from "../models/maintenanceLogsModels";
import type {
  CreateVehicleInput,
  UpdateVehicleInput,
  UpdateVehicleStatusInput,
  VehiclesIdParamsInput,
  VehiclesFilterQueryInput,
} from "../schemas/vehiclesSchemas";
import {
  createVehicleSchema,
  updateVehicleSchema,
  updateVehicleStatusSchema,
  vehiclesIdParamsSchema,
  vehiclesFilterQuerySchema,
} from "../schemas/vehiclesSchemas";
import { ServerErrors } from "../utils/serverErrors";
import { z } from "zod";
import { transportEventProducer } from "../kafka/producers/transportEventProducer.js";
import { kafkaLogger } from "../kafka/logger.js";

/**
 * Service module for managing vehicles in the system.
 */
export const vehiclesServices = {
  /**
   * Creates a new vehicle in the database.
   */
  async createVehicle(data: CreateVehicleInput): Promise<VehicleModel> {
    try {
      const validatedData = createVehicleSchema.parse(data);

      const existingVehicle = await prisma.vehicle.findFirst({
        where: {
          farmId: validatedData.farmId,
          plateNumber: validatedData.plateNumber,
        },
      });

      if (existingVehicle) {
        throw new ServerErrors("Vehicle with this plate number already exists in the farm", 409);
      }

      const vehicle = await prisma.vehicle.create({
        data: validatedData,
      });

      return mapPrismaVehicleToModel(vehicle);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ServerErrors("Validation failed", 400, error.errors);
      }
      if (error instanceof ServerErrors) {
        throw error;
      }
      throw new ServerErrors("Failed to create vehicle", 500, error);
    }
  },

  /**
   * Gets all vehicles for a given farm with filtering and pagination.
   */
  async getAllFarmVehicles(
    filters: VehiclesFilterQueryInput
  ): Promise<{ vehicles: VehicleModel[]; total: number }> {
    try {
      const _validatedFilters = vehiclesFilterQuerySchema.parse(filters);

      const {
        farmId,
        type,
        status,
        fuelType,
        minCapacity,
        maxCapacity,
        startDate,
        endDate,
        nested = false,
        page = 1,
        limit = 10,
      } = filters;

      const where: Prisma.VehicleWhereInput = {
        farmId,
        ...(type && { type }),
        ...(status && { status }),
        ...(fuelType && { fuelType }),
        ...(minCapacity && { capacity: { gte: minCapacity } }),
        ...(maxCapacity && { capacity: { lte: maxCapacity } }),
        ...(startDate || endDate
          ? {
              lastMaintenance: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            }
          : {}),
      };

      const total = await prisma.vehicle.count({ where });

      const vehicles = await prisma.vehicle.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          maintenanceLogs: nested ? true : undefined,
          fuelLogs: nested ? true : undefined,
        },
      });

      return {
        vehicles: nested
          ? vehicles.map(mapNestedPrismaVehicleToModel)
          : vehicles.map(mapPrismaVehicleToModel),
        total,
      };
    } catch (error) {
      throw new ServerErrors("Failed to fetch vehicles", 500, error);
    }
  },

  /**
   * Gets a vehicle by ID.
   */
  async getVehicleById(data: VehiclesIdParamsInput): Promise<VehicleModel | null> {
    try {
      const parsedVehicleId = vehiclesIdParamsSchema.safeParse(data);
      if (!parsedVehicleId.success) {
        throw new ServerErrors("Invalid vehicle ID", 400, parsedVehicleId.error);
      }

      const vehicle = await prisma.vehicle.findUnique({
        where: data,
      });

      return vehicle ? mapPrismaVehicleToModel(vehicle) : null;
    } catch (error) {
      if (error instanceof ServerErrors) {
        throw error;
      }
      throw new ServerErrors("An unexpected error occurred", 500, error);
    }
  },

  /**
   * Updates a vehicle.
   */
  async updateVehicle(id: VehiclesIdParamsInput, data: UpdateVehicleInput): Promise<VehicleModel> {
    try {
      const validatedData = updateVehicleSchema.parse(data);

      const currentVehicle = await prisma.vehicle.findUnique({ where: id });
      if (!currentVehicle) {
        throw new ServerErrors("Vehicle not found", 404);
      }

      if (validatedData.plateNumber) {
        const duplicate = await prisma.vehicle.findFirst({
          where: {
            farmId: currentVehicle.farmId,
            plateNumber: validatedData.plateNumber,
            NOT: { id: id.id },
          },
        });
        if (duplicate) {
          throw new ServerErrors("Vehicle with this plate number already exists in the farm", 409);
        }
      }

      const updatedVehicle = await prisma.vehicle.update({
        where: id,
        data: validatedData,
      });

      return mapPrismaVehicleToModel(updatedVehicle);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new ServerErrors("Vehicle to update does not exist", 404);
        }
      }
      if (error instanceof z.ZodError) {
        throw new ServerErrors("Validation failed", 400, error.errors);
      }
      if (error instanceof ServerErrors) {
        throw error;
      }
      throw new ServerErrors("Failed to update vehicle", 500, error);
    }
  },

  /**
   * Updates vehicle status with validation for RETIRED status.
   */
  async updateVehicleStatus(
    id: VehiclesIdParamsInput,
    data: UpdateVehicleStatusInput
  ): Promise<VehicleModel> {
    try {
      const validatedData = updateVehicleStatusSchema.parse(data);

      const existingVehicle = await prisma.vehicle.findUnique({ where: id });
      if (!existingVehicle) {
        throw new ServerErrors("Vehicle not found", 404);
      }

      if (validatedData.status === "UNAVAILABLE") {
        const vehicle = await prisma.vehicle.findUnique({
          where: id,
          include: {
            shipments: {
              where: {
                status: { in: ["PENDING", "PLANNED", "IN_TRANSIT"] },
              },
            },
          },
        });

        if (!vehicle) {
          throw new ServerErrors("Vehicle not found", 404);
        }

        if (vehicle.shipments.length > 0) {
          throw new ServerErrors("Cannot retire vehicle with pending shipments", 400);
        }
      }

      const updatedVehicle = await prisma.vehicle.update({
        where: id,
        data: { status: validatedData.status },
      });

      transportEventProducer
        .publishVehicleStatusChanged({
          vehicleId: updatedVehicle.id,
          farmId: updatedVehicle.farmId,
          previousStatus: existingVehicle.status,
          newStatus: updatedVehicle.status,
        })
        .catch((err) =>
          kafkaLogger.error("Failed to publish vehicle.statusChanged", {
            vehicleId: updatedVehicle.id,
            error: err instanceof Error ? err.message : String(err),
          })
        );

      return mapPrismaVehicleToModel(updatedVehicle);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new ServerErrors("Vehicle to update does not exist", 404);
        }
      }
      if (error instanceof z.ZodError) {
        throw new ServerErrors("Validation failed", 400, error.errors);
      }
      if (error instanceof ServerErrors) {
        throw error;
      }
      throw new ServerErrors("Failed to update vehicle status", 500, error);
    }
  },

  /**
   * Gets maintenance history for a vehicle.
   */
  async getVehicleMaintenanceHistory(
    vehicleId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ maintenance: MaintenanceLogModel[]; total: number }> {
    try {
      const where = {
        vehicleId,
      };

      const total = await prisma.maintenanceLog.count({ where });

      const maintenanceLogs = await prisma.maintenanceLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: "desc" },
      });

      return {
        maintenance: maintenanceLogs.map(mapPrismaMaintenanceLogToModel),
        total,
      };
    } catch (error) {
      if (error instanceof ServerErrors) {
        throw error;
      }
      throw new ServerErrors("Failed to fetch maintenance history", 500, error);
    }
  },

  /**
   * Gets fuel consumption history for a vehicle.
   */
  async getVehicleFuelHistory(
    vehicleId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ fuelLogs: FuelLogModel[]; total: number }> {
    try {
      const where = {
        vehicleId,
      };

      const total = await prisma.fuelLog.count({ where });

      const fuelLogs = await prisma.fuelLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: "desc" },
      });

      return {
        fuelLogs: fuelLogs.map(mapPrismaFuelLogToModel),
        total,
      };
    } catch (error) {
      if (error instanceof ServerErrors) {
        throw error;
      }
      throw new ServerErrors("Failed to fetch fuel history", 500, error);
    }
  },

  /**
   * Helper service to get a vehicle with nested relations.
   * @param data - Vehicle ID
   * @returns VehicleModel with maintenanceLogs and fuelLogs or null if not found.
   */
  async getVehicleWithRelations(data: VehiclesIdParamsInput): Promise<VehicleModel | null> {
    try {
      const parsedVehicleId = vehiclesIdParamsSchema.safeParse(data);
      if (!parsedVehicleId.success) {
        throw new ServerErrors("Invalid vehicle ID", 400, parsedVehicleId.error);
      }

      const vehicle = await prisma.vehicle.findUnique({
        where: data,
        include: {
          maintenanceLogs: true,
          fuelLogs: true,
        },
      });

      return vehicle ? mapNestedPrismaVehicleToModel(vehicle) : null;
    } catch (error) {
      if (error instanceof ServerErrors) {
        throw error;
      }
      throw new ServerErrors("Failed to fetch vehicle with relations", 500, error);
    }
  },
};
