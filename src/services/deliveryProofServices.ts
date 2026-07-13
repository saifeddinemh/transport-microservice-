import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";
import type { DeliveryProofModel, PresignedUrlResponse } from "../models/deliveryProofModels";
import {
  mapPrismaDeliveryProofToModel,
  mapNestedPrismaDeliveryProofToModel,
} from "../models/deliveryProofModels";
import type {
  CreateDeliveryProofInput,
  UpdateDeliveryProofInput,
  PresignedUploadInput,
  DeliveryProofsIdParamsInput,
  DeliveryProofsFilterQueryInput,
} from "../schemas/deliveryProofSchemas";
import {
  createDeliveryProofSchema,
  updateDeliveryProofSchema,
  presignedUploadSchema,
  deliveryProofsFilterQuerySchema,
  DeliveryProofsIdParamsSchema,
} from "../schemas/deliveryProofSchemas";
import { ServerErrors } from "../utils/serverErrors";
import { generatePresignedUrl } from "../utils/presignedUrl";
import { z } from "zod";
import { transportEventProducer } from "../kafka/producers/transportEventProducer.js";
import { kafkaLogger } from "../kafka/logger.js";

/**
 * Service module for managing delivery proof requests in the system.
 */
export const deliveryProofServices = {
  /**
   * Generate a presigned URL for uploading delivery proof files.
   */
  async createPresignedUploadUrl(data: PresignedUploadInput): Promise<PresignedUrlResponse> {
    try {
      const validatedData = presignedUploadSchema.parse(data);

      const presignedUrl = await generatePresignedUrl(
        validatedData.fileName,
        validatedData.fileType,
        validatedData.shipmentId
      );

      return presignedUrl;
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
   * Create a new delivery proof record in the database.
   */
  async createDeliveryProof(data: CreateDeliveryProofInput): Promise<DeliveryProofModel> {
    try {
      const validatedData = createDeliveryProofSchema.parse(data);

      const newDeliveryProof = await prisma.deliveryProof.create({
        data: {
          recipientName: validatedData.recipientName,
          receivedAt: validatedData.receivedAt,
          signature: validatedData.signature ?? null,
          shipmentId: validatedData.shipmentId,
          proofUrl: validatedData.proofUrl ?? null,
          isValid: true,
        },
      });

      transportEventProducer
        .publishDeliveryProofRecorded({
          deliveryProofId: newDeliveryProof.id,
          shipmentId: newDeliveryProof.shipmentId,
          recipientName: newDeliveryProof.recipientName,
          receivedAt: newDeliveryProof.receivedAt.toISOString(),
          isValid: newDeliveryProof.isValid,
        })
        .catch((err) =>
          kafkaLogger.error("Failed to publish deliveryProof.recorded", {
            deliveryProofId: newDeliveryProof.id,
            error: err instanceof Error ? err.message : String(err),
          })
        );

      return mapPrismaDeliveryProofToModel(newDeliveryProof);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2003") {
          throw new ServerErrors("Shipment not found", 404);
        }
      }
      if (error instanceof z.ZodError) {
        throw new ServerErrors("Validation failed", 400, error.errors);
      }
      throw error instanceof ServerErrors
        ? error
        : new ServerErrors("An unexpected error occurred", 500, error);
    }
  },

  /**
   * Get all delivery proofs with filtering and pagination.
   */
  async getAllDeliveryProofs(
    filters: DeliveryProofsFilterQueryInput
  ): Promise<{ deliveryProofs: DeliveryProofModel[]; total: number }> {
    try {
      const validatedFilters = deliveryProofsFilterQuerySchema.parse(filters);

      const {
        shipmentId,
        isValid,
        startDate,
        endDate,
        page = 1,
        limit = 10,
        nested = false,
      } = validatedFilters;

      const where: Prisma.DeliveryProofWhereInput = {
        ...(shipmentId && { shipmentId }),
        ...(isValid !== undefined && { isValid }),
        ...(startDate || endDate
          ? {
              receivedAt: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            }
          : {}),
      };

      const total = await prisma.deliveryProof.count({ where });

      const proofs = await prisma.deliveryProof.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: nested ? { shipment: true } : undefined,
      });

      return {
        deliveryProofs: nested
          ? proofs.map(mapNestedPrismaDeliveryProofToModel)
          : proofs.map(mapPrismaDeliveryProofToModel),
        total,
      };
    } catch (error) {
      throw new ServerErrors("Failed to fetch delivery proofs", 500, error);
    }
  },

  /**
   * Get a single delivery proof by ID.
   */
  async getDeliveryProofById(
    data: DeliveryProofsIdParamsInput
  ): Promise<DeliveryProofModel | null> {
    try {
      const parsedId = DeliveryProofsIdParamsSchema.safeParse(data);
      if (!parsedId.success) {
        throw new ServerErrors("Invalid delivery proof ID", 400, parsedId.error);
      }

      const deliveryProof = await prisma.deliveryProof.findUnique({
        where: { id: data.id },
      });

      return deliveryProof ? mapPrismaDeliveryProofToModel(deliveryProof) : null;
    } catch (error) {
      if (error instanceof ServerErrors) throw error;
      throw new ServerErrors("An unexpected error occurred", 500, error);
    }
  },

  /**
   * Update a delivery proof (for invalidation with reason).
   */
  async updateDeliveryProof(
    id: DeliveryProofsIdParamsInput,
    data: UpdateDeliveryProofInput
  ): Promise<DeliveryProofModel> {
    try {
      const validatedData = updateDeliveryProofSchema.parse(data);

      const existingProof = await prisma.deliveryProof.findUnique({
        where: { id: id.id },
      });

      if (!existingProof) {
        throw new ServerErrors("Delivery proof not found", 404);
      }

      const updatedProof = await prisma.deliveryProof.update({
        where: { id: id.id },
        data: validatedData,
      });

      return mapPrismaDeliveryProofToModel(updatedProof);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ServerErrors("Validation failed", 400, error.errors);
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new ServerErrors("Delivery proof to update does not exist", 404);
      }
      throw error instanceof ServerErrors
        ? error
        : new ServerErrors("An unexpected error occurred", 500, error);
    }
  },
};
