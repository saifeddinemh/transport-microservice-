import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";
import type { ShipmentModel } from "../models/shipmentModels";
import { mapPrismaShipmentToModel, mapNestedPrismaShipmentToModel } from "../models/shipmentModels";
import type {
  CreateShipmentInput,
  UpdateShipmentInput,
  UpdateShipmentStatusInput,
  ShipmentIdParamsInput,
  ShipmentsFilterQueryInput,
} from "../schemas/shipmentSchemas";
import {
  createShipmentSchema,
  updateShipmentSchema,
  updateShipmentStatusSchema,
  shipmentIdParamsSchema,
  shipmentsFilterQuerySchema,
  SHIPMENT_STATUS_TRANSITIONS,
} from "../schemas/shipmentSchemas";
import { ServerErrors } from "../utils/serverErrors";
import { z } from "zod";
import { transportEventProducer } from "../kafka/producers/transportEventProducer.js";
import { kafkaLogger } from "../kafka/logger.js";

/**
 * Service module for managing shipments in the system.
 */
export const shipmentsServices = {
  /**
   * Creates a new shipment in the database.
   * @param data - Shipment creation input.
   * @returns The newly created shipment model.
   */
  async createShipment(data: CreateShipmentInput): Promise<ShipmentModel> {
    try {
      const validatedData = createShipmentSchema.parse(data);

      const existingShipment = await prisma.shipment.findUnique({
        where: { requestId: validatedData.requestId },
      });

      if (existingShipment) {
        throw new ServerErrors("A shipment already exists for this transport request", 409);
      }

      if (validatedData.vehicleId) {
        const vehicle = await prisma.vehicle.findFirst({
          where: {
            id: validatedData.vehicleId,
            farmId: validatedData.farmId,
            status: "AVAILABLE",
          },
        });

        if (!vehicle) {
          throw new ServerErrors(
            "Vehicle not found, does not belong to this farm, or is not available",
            400
          );
        }
      }

      if (validatedData.driverId) {
        const driver = await prisma.driver.findFirst({
          where: {
            id: validatedData.driverId,
            farmId: validatedData.farmId,
            status: "ACTIVE",
          },
        });

        if (!driver) {
          throw new ServerErrors(
            "Driver not found, does not belong to this farm, or is not active",
            400
          );
        }
      }

      if (validatedData.transportId) {
        const transport = await prisma.transport.findFirst({
          where: {
            id: validatedData.transportId,
            farmId: validatedData.farmId,
            status: "ACTIVE",
          },
        });

        if (!transport) {
          throw new ServerErrors(
            "Transport company not found, does not belong to this farm, or is inactive",
            400
          );
        }
      }

      const shipment = await prisma.shipment.create({
        data: validatedData,
      });

      transportEventProducer
        .publishShipmentCreated({
          shipmentId: shipment.id,
          requestId: shipment.requestId,
          farmId: shipment.farmId,
          status: shipment.status,
          startLocation: shipment.startLocation,
          endLocation: shipment.endLocation,
          totalWeight: shipment.totalWeight,
          totalCost: shipment.totalCost,
          estimatedArrival: shipment.estimatedArrival.toISOString(),
          vehicleId: shipment.vehicleId,
          driverId: shipment.driverId,
          transportId: shipment.transportId,
        })
        .catch((err) =>
          kafkaLogger.error("Failed to publish shipment.created", {
            shipmentId: shipment.id,
            error: err instanceof Error ? err.message : String(err),
          })
        );

      return mapPrismaShipmentToModel(shipment);
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
   * Gets all shipments for a farm with filtering and pagination.
   * @param filters - Shipment filters object as ShipmentsFilterQueryInput
   * @returns Array of shipment models and total count.
   */
  async getAllFarmShipments(
    filters: ShipmentsFilterQueryInput
  ): Promise<{ shipments: ShipmentModel[]; total: number }> {
    try {
      const validatedFilters = shipmentsFilterQuerySchema.parse(filters);

      const {
        farmId,
        status,
        vehicleId,
        driverId,
        transportId,
        startDate,
        endDate,
        nested = false,
        page = 1,
        limit = 10,
      } = validatedFilters;

      const where: Prisma.ShipmentWhereInput = {
        ...(farmId && { farmId }),
        ...(status && { status }),
        ...(driverId && { driverId }),
        ...(vehicleId && { vehicleId }),
        ...(transportId && { transportId }),
      };

      if (startDate && endDate) {
        where.estimatedArrival = {
          gte: startDate,
          lte: endDate,
        };
      }

      const total = await prisma.shipment.count({ where });

      const shipments = await prisma.shipment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          vehicle: nested ? true : undefined,
          driver: nested ? true : undefined,
          deliveryProofs: nested ? true : undefined,
        },
      });

      return {
        shipments: nested
          ? shipments.map(mapNestedPrismaShipmentToModel)
          : shipments.map(mapPrismaShipmentToModel),
        total,
      };
    } catch (error) {
      throw new ServerErrors("Failed to fetch shipments", 500, error);
    }
  },

  /**
   * Gets a shipment by ID.
   * @param data - Shipment ID.
   * @returns The shipment model or null if not found.
   */
  async getShipmentById(data: ShipmentIdParamsInput): Promise<ShipmentModel | null> {
    try {
      const parsedShipmentId = shipmentIdParamsSchema.safeParse(data);
      if (!parsedShipmentId.success) {
        throw new ServerErrors("Invalid shipment ID", 400, parsedShipmentId.error);
      }

      const shipment = await prisma.shipment.findUnique({
        where: data,
      });

      return shipment ? mapPrismaShipmentToModel(shipment) : null;
    } catch (error) {
      if (error instanceof ServerErrors) {
        throw error;
      }
      throw new ServerErrors("An unexpected error occurred", 500, error);
    }
  },

  /**
   * Updates a shipment.
   * @param id - Shipment ID.
   * @param data - Shipment update input.
   * @returns The updated shipment model.
   */
  async updateShipment(
    id: ShipmentIdParamsInput,
    data: UpdateShipmentInput
  ): Promise<ShipmentModel> {
    try {
      const validatedData = updateShipmentSchema.parse(data);

      const currentShipment = await prisma.shipment.findUnique({ where: id });
      if (!currentShipment) {
        throw new ServerErrors("Shipment not found", 404);
      }

      if (currentShipment.status === "DELIVERED" || currentShipment.status === "RETURNED") {
        throw new ServerErrors(
          `Cannot update a shipment with status: ${currentShipment.status}`,
          400
        );
      }

      if (validatedData.vehicleId) {
        const vehicle = await prisma.vehicle.findFirst({
          where: {
            id: validatedData.vehicleId,
            farmId: currentShipment.farmId,
            status: "AVAILABLE",
          },
        });

        if (!vehicle) {
          throw new ServerErrors(
            "Vehicle not found, does not belong to this farm, or is not available",
            400
          );
        }
      }

      if (validatedData.driverId) {
        const driver = await prisma.driver.findFirst({
          where: {
            id: validatedData.driverId,
            farmId: currentShipment.farmId,
            status: "ACTIVE",
          },
        });

        if (!driver) {
          throw new ServerErrors(
            "Driver not found, does not belong to this farm, or is not active",
            400
          );
        }
      }

      const updatedShipment = await prisma.shipment.update({
        where: id,
        data: validatedData,
      });

      return mapPrismaShipmentToModel(updatedShipment);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new ServerErrors("Shipment to update does not exist.", 404);
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
   * Updates shipment status with transition validation.
   * @param id - Shipment ID.
   * @param data - Status update input.
   * @returns The updated shipment model.
   */
  async updateShipmentStatus(
    id: ShipmentIdParamsInput,
    data: UpdateShipmentStatusInput
  ): Promise<ShipmentModel> {
    try {
      const validatedData = updateShipmentStatusSchema.parse(data);

      const currentShipment = await prisma.shipment.findUnique({ where: id });
      if (!currentShipment) {
        throw new ServerErrors("Shipment not found", 404);
      }

      const allowedTransitions = SHIPMENT_STATUS_TRANSITIONS[currentShipment.status] ?? [];

      if (!allowedTransitions.includes(validatedData.status)) {
        throw new ServerErrors(
          `Invalid status transition from '${currentShipment.status}' to '${validatedData.status}'. Allowed transitions: ${allowedTransitions.join(", ") || "none"}`,
          400
        );
      }

      const updatedShipment = await prisma.shipment.update({
        where: id,
        data: { status: validatedData.status },
      });

      transportEventProducer
        .publishShipmentStatusUpdated({
          shipmentId: updatedShipment.id,
          farmId: updatedShipment.farmId,
          previousStatus: currentShipment.status,
          newStatus: updatedShipment.status,
        })
        .catch((err) =>
          kafkaLogger.error("Failed to publish shipment.statusUpdated", {
            shipmentId: updatedShipment.id,
            error: err instanceof Error ? err.message : String(err),
          })
        );

      return mapPrismaShipmentToModel(updatedShipment);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new ServerErrors("Shipment to update does not exist.", 404);
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
   * Helper service to get a shipment with nested relations.
   * @param data - Shipment ID
   * @returns ShipmentModel with vehicle, driver, deliveryProofs or null if not found.
   */
  async getShipmentWithRelations(data: ShipmentIdParamsInput): Promise<ShipmentModel | null> {
    try {
      const parsedShipmentId = shipmentIdParamsSchema.safeParse(data);
      if (!parsedShipmentId.success) {
        throw new ServerErrors("Invalid shipment ID", 400, parsedShipmentId.error);
      }

      const shipment = await prisma.shipment.findUnique({
        where: data,
        include: {
          vehicle: true,
          driver: true,
          transport: true,
          transportRequest: true,
          deliveryProofs: true,
        },
      });

      return shipment ? mapNestedPrismaShipmentToModel(shipment) : null;
    } catch (error) {
      if (error instanceof ServerErrors) {
        throw error;
      }
      throw new ServerErrors("Failed to fetch shipment with relations", 500, error);
    }
  },
};
