import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";
import type { TransportRequestModel } from "../models/transportRequestModels";
import {
  mapPrismaTransportRequestToModel,
  mapNestedPrismaTransportRequestToModel,
} from "../models/transportRequestModels";
import type {
  CreateTransportRequestInput,
  UpdateTransportRequestInput,
  UpdateTransportRequestStatusInput,
  TransportRequestsFilterQueryInput,
  ConvertToInternalShipmentInput,
  ConvertToExternalShipmentInput,
  TransportRequestsIdParamsInput,
} from "../schemas/transportRequestSchemas";
import {
  createTransportRequestSchema,
  updateTransportRequestSchema,
  updateTransportRequestStatusSchema,
  convertToInternalShipmentSchema,
  convertToExternalShipmentSchema,
  transportRequestsFilterQuerySchema,
  TransportRequestsIdParamsSchema,
} from "../schemas/transportRequestSchemas";
import { ServerErrors } from "../utils/serverErrors";
import { z } from "zod";
import { transportEventProducer } from "../kafka/producers/transportEventProducer.js";
import { kafkaLogger } from "../kafka/logger.js";

/**
 * Service module for managing transport requests in the system
 */
export const transportRequestsServices = {
  /**
   * Creates a new transport request in the database
   * @param data - Transport request creation input
   * @returns The newly created transport request model
   */
  async createTransportRequest(data: CreateTransportRequestInput): Promise<TransportRequestModel> {
    try {
      const validatedData = createTransportRequestSchema.parse(data);

      const newTransportRequest = await prisma.transportRequest.create({
        data: {
          ...validatedData,
          status: "PENDING",
        },
      });

      transportEventProducer
        .publishTransportRequestCreated({
          transportRequestId: newTransportRequest.id,
          farmId: newTransportRequest.farmId,
          ownerId: newTransportRequest.ownerId,
          employeeId: newTransportRequest.employeeId,
          source: newTransportRequest.source,
          destination: newTransportRequest.destination,
          category: newTransportRequest.category,
          weight: newTransportRequest.weight,
          requestDate: newTransportRequest.requestDate.toISOString(),
        })
        .catch((err) =>
          kafkaLogger.error("Failed to publish transportRequest.created", {
            transportRequestId: newTransportRequest.id,
            error: err instanceof Error ? err.message : String(err),
          })
        );

      return mapPrismaTransportRequestToModel(newTransportRequest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ServerErrors("Validation failed", 400, error.errors);
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2003") {
          throw new ServerErrors(
            "Foreign key constraint failed. Please check farmId, ownerId, employeeId, or shipmentId.",
            400
          );
        }
      }
      throw new ServerErrors("An unexpected error occurred", 500, error);
    }
  },

  /**
   * Retrieves transport requests with filtering and pagination
   * @param query - Query parameters for filtering and pagination
   * @returns Paginated transport requests response
   */
  async getTransportRequests(
    filters: TransportRequestsFilterQueryInput
  ): Promise<{ data: TransportRequestModel[]; total: number }> {
    try {
      const validatedFilters = transportRequestsFilterQuerySchema.parse(filters);

      const {
        status,
        category,
        farmId,
        ownerId,
        startDate,
        endDate,
        page = 1,
        limit = 10,
        nested = false,
      } = validatedFilters;

      const where: Prisma.TransportRequestWhereInput = {
        ...(status && { status }),
        ...(category && { category }),
        ...(farmId && { farmId }),
        ...(ownerId && { ownerId }),
        ...(startDate || endDate
          ? {
              requestDate: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            }
          : {}),
      };

      const skip = (page - 1) * limit;

      const [total, transportRequests] = await Promise.all([
        prisma.transportRequest.count({ where }),
        prisma.transportRequest.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: nested
            ? {
                owner: true,
                employee: true,
                shipment: true,
                farm: true,
              }
            : undefined,
        }),
      ]);

      const _totalPages = Math.ceil(total / limit);

      return {
        data: nested
          ? transportRequests.map(mapNestedPrismaTransportRequestToModel)
          : transportRequests.map(mapPrismaTransportRequestToModel),
        total,
      };
    } catch (error) {
      throw new ServerErrors("An unexpected error occurred", 500, error);
    }
  },

  /**
   * Retrieves a single transport request by ID
   * @param id - Transport request ID
   * @returns Transport request with relations
   */
  async getTransportRequestById(
    data: TransportRequestsIdParamsInput
  ): Promise<TransportRequestModel | null> {
    try {
      const parsedId = TransportRequestsIdParamsSchema.safeParse(data);
      if (!parsedId.success) {
        throw new ServerErrors("Invalid request ID", 400, parsedId.error);
      }

      const transportRequest = await prisma.transportRequest.findUnique({
        where: { id: data.id },
        include: {
          owner: true,
          employee: true,
          shipment: true,
          farm: true,
        },
      });

      if (!transportRequest) {
        throw new ServerErrors("Transport request not found", 404);
      }

      return mapNestedPrismaTransportRequestToModel(transportRequest);
    } catch (error) {
      throw error instanceof ServerErrors
        ? error
        : new ServerErrors("An unexpected error occurred", 500, error);
    }
  },

  /**
   * Updates an existing transport request
   * @param id - Transport request ID
   * @param data - Update data
   * @returns Updated transport request model
   */
  async updateTransportRequest(
    id: string,
    data: UpdateTransportRequestInput
  ): Promise<TransportRequestModel> {
    try {
      const validatedData = updateTransportRequestSchema.parse(data);

      const existingRequest = await prisma.transportRequest.findUnique({
        where: { id },
      });

      if (!existingRequest) {
        throw new ServerErrors("Transport request not found", 404);
      }

      const updatedTransportRequest = await prisma.transportRequest.update({
        where: { id },
        data: validatedData,
      });

      return mapPrismaTransportRequestToModel(updatedTransportRequest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ServerErrors("Validation failed", 400, error.errors);
      }
      throw error instanceof ServerErrors
        ? error
        : new ServerErrors("An unexpected error occurred", 500, error);
    }
  },

  /**
   * Updates the status of a transport request (approval workflow)
   * @param id - Transport request ID
   * @param data - Status update data
   * @returns Updated transport request model
   */
  async updateTransportRequestStatus(
    id: string,
    data: UpdateTransportRequestStatusInput
  ): Promise<TransportRequestModel> {
    try {
      const validatedData = updateTransportRequestStatusSchema.parse(data);

      const existingRequest = await prisma.transportRequest.findUnique({
        where: { id },
      });

      if (!existingRequest) {
        throw new ServerErrors("Transport request not found", 404);
      }

      const currentStatus = existingRequest.status;
      const newStatus = validatedData.status;

      if (currentStatus === "APPROVED" && newStatus === "PENDING") {
        throw new ServerErrors("Cannot change status from APPROVED back to PENDING", 400);
      }

      if (currentStatus === "CANCELLED") {
        throw new ServerErrors("Cannot change status of a cancelled request", 400);
      }

      const updatedTransportRequest = await prisma.transportRequest.update({
        where: { id },
        data: { status: newStatus },
      });

      if (newStatus === "APPROVED") {
        transportEventProducer
          .publishTransportRequestApproved({
            transportRequestId: updatedTransportRequest.id,
            farmId: updatedTransportRequest.farmId,
            status: "APPROVED",
          })
          .catch((err) =>
            kafkaLogger.error("Failed to publish transportRequest.approved", {
              transportRequestId: updatedTransportRequest.id,
              error: err instanceof Error ? err.message : String(err),
            })
          );
      }

      return mapPrismaTransportRequestToModel(updatedTransportRequest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ServerErrors("Validation failed", 400, error.errors);
      }
      throw error instanceof ServerErrors
        ? error
        : new ServerErrors("An unexpected error occurred", 500, error);
    }
  },

  /**
   * Converts a transport request to an INTERNAL shipment
   * Uses own vehicles and drivers
   * @param id - Transport request ID
   * @param data - Internal shipment data
   * @returns Created shipment
   */
  async convertToInternalShipment(id: string, data: ConvertToInternalShipmentInput) {
    try {
      const validatedData = convertToInternalShipmentSchema.parse(data);

      const transportRequest = await prisma.transportRequest.findUnique({
        where: { id },
        include: { shipment: true },
      });

      if (!transportRequest) {
        throw new ServerErrors("Transport request not found", 404);
      }

      if (transportRequest.status !== "APPROVED") {
        throw new ServerErrors("Transport request must be APPROVED before conversion", 400);
      }

      if (transportRequest.shipment) {
        throw new ServerErrors("Transport request has already been converted to a shipment", 400);
      }

      const [vehicle, driver] = await Promise.all([
        prisma.vehicle.findUnique({ where: { id: validatedData.vehicleId } }),
        prisma.driver.findUnique({ where: { id: validatedData.driverId } }),
      ]);

      if (!vehicle || vehicle.farmId !== transportRequest.farmId) {
        throw new ServerErrors("Vehicle not found or does not belong to this farm", 400);
      }

      if (!driver || driver.farmId !== transportRequest.farmId) {
        throw new ServerErrors("Driver not found or does not belong to this farm", 400);
      }

      let internalTransport = await prisma.transport.findFirst({
        where: {
          farmId: transportRequest.farmId,
          name: "INTERNAL_TRANSPORT",
        },
      });

      if (!internalTransport) {
        internalTransport = await prisma.transport.create({
          data: {
            name: "INTERNAL_TRANSPORT",
            email: "internal@farm.local",
            phoneNumber: "N/A",
            address: "Internal",
            status: "ACTIVE",
            farmId: transportRequest.farmId,
          },
        });
      }

      const shipment = await prisma.shipment.create({
        data: {
          status: "PENDING",
          startLocation: transportRequest.source,
          endLocation: transportRequest.destination,
          wayPoints: validatedData.wayPoints,
          totalWeight: transportRequest.weight,
          totalCost: validatedData.totalCost || 0,
          estimatedArrival: validatedData.estimatedArrival,
          requestId: transportRequest.id,
          vehicleId: validatedData.vehicleId,
          driverId: validatedData.driverId,
          farmId: transportRequest.farmId,
          transportId: internalTransport.id,
        },
      });

      return shipment;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ServerErrors("Validation failed", 400, error.errors);
      }
      throw error instanceof ServerErrors
        ? error
        : new ServerErrors("An unexpected error occurred", 500, error);
    }
  },

  /**
   * Converts a transport request to an EXTERNAL shipment
   * Uses external transport company
   * @param id - Transport request ID
   * @param data - External shipment data
   * @returns Created shipment
   */
  async convertToExternalShipment(id: string, data: ConvertToExternalShipmentInput) {
    try {
      const validatedData = convertToExternalShipmentSchema.parse(data);

      const transportRequest = await prisma.transportRequest.findUnique({
        where: { id },
        include: { shipment: true },
      });

      if (!transportRequest) {
        throw new ServerErrors("Transport request not found", 404);
      }

      if (transportRequest.status !== "APPROVED") {
        throw new ServerErrors("Transport request must be APPROVED before conversion", 400);
      }

      if (transportRequest.shipment) {
        throw new ServerErrors("Transport request has already been converted to a shipment", 400);
      }

      const transport = await prisma.transport.findUnique({
        where: { id: validatedData.transportId },
      });

      if (!transport) {
        throw new ServerErrors("External transport company not found", 404);
      }

      if (validatedData.vehicleId) {
        const vehicle = await prisma.vehicle.findUnique({
          where: { id: validatedData.vehicleId },
        });
        if (!vehicle) {
          throw new ServerErrors("Vehicle not found", 404);
        }
      }

      if (validatedData.driverId) {
        const driver = await prisma.driver.findUnique({
          where: { id: validatedData.driverId },
        });
        if (!driver) {
          throw new ServerErrors("Driver not found", 404);
        }
      }

      const shipment = await prisma.shipment.create({
        data: {
          status: "PENDING",
          startLocation: transportRequest.source,
          endLocation: transportRequest.destination,
          wayPoints: validatedData.wayPoints,
          totalWeight: transportRequest.weight,
          totalCost: validatedData.totalCost,
          estimatedArrival: validatedData.estimatedArrival,
          requestId: transportRequest.id,
          vehicleId: validatedData.vehicleId || null,
          driverId: validatedData.driverId || null,
          farmId: transportRequest.farmId,
          transportId: validatedData.transportId,
        },
      });

      return shipment;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ServerErrors("Validation failed", 400, error.errors);
      }
      throw error instanceof ServerErrors
        ? error
        : new ServerErrors("An unexpected error occurred", 500, error);
    }
  },
};
