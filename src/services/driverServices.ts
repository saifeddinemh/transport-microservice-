import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";
import type { DriverModel } from "../models/driverModels";
import { mapPrismaDriverToModel, mapNestedPrismaDriverToModel } from "../models/driverModels";
import type { ShipmentModel } from "../models/shipmentModels";
import { mapPrismaShipmentToModel } from "../models/shipmentModels";
import type {
  CreateDriverInput,
  UpdateDriverInput,
  UpdateDriverStatusInput,
  DriverIdParamsInput,
  DriversFilterQueryInput,
} from "../schemas/driverSchemas";
import {
  createDriverSchema,
  updateDriverSchema,
  updateDriverStatusSchema,
  DriverIdParamsSchema,
  driversFilterQuerySchema,
} from "../schemas/driverSchemas";
import { ServerErrors } from "../utils/serverErrors";
import { z } from "zod";
import { transportEventProducer } from "../kafka/producers/transportEventProducer.js";
import { kafkaLogger } from "../kafka/logger.js";

/**
 * Service module for managing drivers in the system.
 */
export const driversServices = {
  /**
   * Creates a new driver in the database.
   * @param data - Driver creation input.
   * @returns The newly created driver model.
   */
  async createDriver(data: CreateDriverInput): Promise<DriverModel> {
    try {
      const validatedData = createDriverSchema.parse(data);

      const existingDriverByEmail = await prisma.driver.findUnique({
        where: { email: validatedData.email },
      });

      if (existingDriverByEmail) {
        throw new ServerErrors("A driver with this email already exists", 409);
      }

      const existingDriverByLicense = await prisma.driver.findFirst({
        where: {
          farmId: validatedData.farmId,
          licenseNumber: validatedData.licenseNumber,
        },
      });

      if (existingDriverByLicense) {
        throw new ServerErrors("A driver with this license number already exists in the farm", 409);
      }

      const driver = await prisma.driver.create({
        data: validatedData,
      });

      transportEventProducer
        .publishDriverCreated({
          driverId: driver.id,
          farmId: driver.farmId,
          name: driver.name,
          email: driver.email,
          licenseNumber: driver.licenseNumber,
        })
        .catch((err) =>
          kafkaLogger.error("Failed to publish driver.created", {
            driverId: driver.id,
            error: err instanceof Error ? err.message : String(err),
          })
        );

      return mapPrismaDriverToModel(driver);
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
   * Gets all drivers for a farm with filtering and pagination.
   * @param filters - Driver filters object as DriversFilterQueryInput
   * @returns Array of driver models and total count.
   */
  async getAllFarmDrivers(
    filters: DriversFilterQueryInput
  ): Promise<{ drivers: DriverModel[]; total: number }> {
    try {
      const validatedFilters = driversFilterQuerySchema.parse(filters);

      const {
        farmId,
        status,
        minExperience,
        search,
        nested = false,
        page = 1,
        limit = 10,
      } = validatedFilters;

      const where: Prisma.DriverWhereInput = {
        ...(farmId && { farmId }),
        ...(status && { status }),
        ...(minExperience !== undefined && { experienceYears: { gte: minExperience } }),
      };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { licenseNumber: { contains: search, mode: "insensitive" } },
        ];
      }

      const total = await prisma.driver.count({ where });

      const drivers = await prisma.driver.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          shipments: nested ? true : undefined,
        },
      });

      return {
        drivers: nested
          ? drivers.map(mapNestedPrismaDriverToModel)
          : drivers.map(mapPrismaDriverToModel),
        total,
      };
    } catch (error) {
      throw new ServerErrors("Failed to fetch drivers", 500, error);
    }
  },

  /**
   * Gets a driver by ID.
   * @param data - Driver ID.
   * @returns The driver model or null if not found.
   */
  async getDriverById(data: DriverIdParamsInput): Promise<DriverModel | null> {
    try {
      const parsedDriverId = DriverIdParamsSchema.safeParse(data);
      if (!parsedDriverId.success) {
        throw new ServerErrors("Invalid driver ID", 400, parsedDriverId.error);
      }

      const driver = await prisma.driver.findUnique({
        where: data,
      });

      return driver ? mapPrismaDriverToModel(driver) : null;
    } catch (error) {
      if (error instanceof ServerErrors) {
        throw error;
      }
      throw new ServerErrors("An unexpected error occurred", 500, error);
    }
  },

  /**
   * Updates a driver.
   * @param id - Driver ID.
   * @param data - Driver update input.
   * @returns The updated driver model.
   */
  async updateDriver(id: DriverIdParamsInput, data: UpdateDriverInput): Promise<DriverModel> {
    try {
      const validatedData = updateDriverSchema.parse(data);

      const currentDriver = await prisma.driver.findUnique({ where: id });
      if (!currentDriver) {
        throw new ServerErrors("Driver not found", 404);
      }

      if (validatedData.email && validatedData.email !== currentDriver.email) {
        const duplicate = await prisma.driver.findUnique({
          where: { email: validatedData.email },
        });

        if (duplicate) {
          throw new ServerErrors("A driver with this email already exists", 409);
        }
      }

      if (
        validatedData.licenseNumber &&
        validatedData.licenseNumber !== currentDriver.licenseNumber
      ) {
        const duplicate = await prisma.driver.findFirst({
          where: {
            farmId: currentDriver.farmId,
            licenseNumber: validatedData.licenseNumber,
            NOT: { id: id.id },
          },
        });

        if (duplicate) {
          throw new ServerErrors(
            "A driver with this license number already exists in the farm",
            409
          );
        }
      }

      const updatedDriver = await prisma.driver.update({
        where: id,
        data: validatedData,
      });

      return mapPrismaDriverToModel(updatedDriver);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new ServerErrors("Driver to update does not exist.", 404);
        }
      }
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
   * Updates driver availability status.
   * Blocks transition to INACTIVE if active shipments exist.
   * @param id - Driver ID.
   * @param data - Status update input.
   * @returns The updated driver model.
   */
  async updateDriverStatus(
    id: DriverIdParamsInput,
    data: UpdateDriverStatusInput
  ): Promise<DriverModel> {
    try {
      const validatedData = updateDriverStatusSchema.parse(data);

      // Prevent marking INACTIVE if active shipments exist
      if (validatedData.status === "INACTIVE") {
        const driver = await prisma.driver.findUnique({
          where: id,
          include: {
            shipments: {
              where: {
                status: { in: ["PENDING", "PLANNED", "IN_TRANSIT"] },
              },
            },
          },
        });

        if (!driver) {
          throw new ServerErrors("Driver not found", 404);
        }

        if (driver.shipments.length > 0) {
          throw new ServerErrors("Cannot mark driver as inactive: active shipments exist", 400);
        }
      }

      const updatedDriver = await prisma.driver.update({
        where: id,
        data: { status: validatedData.status },
      });

      return mapPrismaDriverToModel(updatedDriver);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new ServerErrors("Driver to update does not exist.", 404);
        }
      }
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
   * Gets assigned missions (shipments) for a driver with pagination.
   * @param driverId - Driver ID string.
   * @param page - Page number.
   * @param limit - Items per page.
   * @returns Array of driver assignment models and total count.
   */
  async getDriverAssignments(
    driverId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ assignments: ShipmentModel[]; total: number }> {
    try {
      const where = { driverId };

      const total = await prisma.shipment.count({ where });

      const shipments = await prisma.shipment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      });

      return {
        assignments: shipments.map(mapPrismaShipmentToModel),
        total,
      };
    } catch (error) {
      if (error instanceof ServerErrors) {
        throw error;
      }
      throw new ServerErrors("Failed to fetch driver assignments", 500, error);
    }
  },

  /**
   * Helper service to get a driver with nested relations.
   * @param data - Driver ID
   * @returns DriverModel with shipments or null if not found.
   */
  async getDriverWithRelations(data: DriverIdParamsInput): Promise<DriverModel | null> {
    try {
      const parsedDriverId = DriverIdParamsSchema.safeParse(data);
      if (!parsedDriverId.success) {
        throw new ServerErrors("Invalid driver ID", 400, parsedDriverId.error);
      }

      const driver = await prisma.driver.findUnique({
        where: data,
        include: {
          shipments: true,
        },
      });

      return driver ? mapNestedPrismaDriverToModel(driver) : null;
    } catch (error) {
      if (error instanceof ServerErrors) {
        throw error;
      }
      throw new ServerErrors("Failed to fetch driver with relations", 500, error);
    }
  },
};
