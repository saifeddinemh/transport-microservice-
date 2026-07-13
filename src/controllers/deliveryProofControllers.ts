import type { FastifyReply, FastifyRequest } from "fastify";
import { deliveryProofServices } from "../services/deliveryProofServices";
import type {
  CreateDeliveryProofInput,
  UpdateDeliveryProofInput,
  PresignedUploadInput,
  DeliveryProofsFilterQueryInput,
  DeliveryProofsIdParamsInput,
} from "../schemas/deliveryProofSchemas";
import { ServerErrors } from "../utils/serverErrors";
import type { JwtPayload } from "../types/JwtPayload";
import type { DeliveryProofModel } from "../models/deliveryProofModels";

export const deliveryProofController = {
  /**
   * Handles generating a presigned URL
   */
  async createPresignedUploadUrlHandler(
    request: FastifyRequest<{ Body: PresignedUploadInput }>,
    reply: FastifyReply
  ) {
    try {
      const owner = request.owner as JwtPayload;
      if (!owner || !owner.id) {
        return reply.status(401).send({ message: "Authentication required" });
      }

      const presignedUrl = await deliveryProofServices.createPresignedUploadUrl(request.body);
      return reply.status(200).send(presignedUrl);
    } catch (error) {
      if (error instanceof ServerErrors) {
        return reply
          .status(error.statusCode)
          .send({ message: error.message, details: error.details });
      }
      return reply.status(500).send({ message: "Failed to generate presigned URL" });
    }
  },

  /**
   * Handles creating a new delivery proof
   */
  async createDeliveryProofHandler(
    request: FastifyRequest<{ Body: CreateDeliveryProofInput }>,
    reply: FastifyReply
  ) {
    try {
      const newDeliveryProof = await deliveryProofServices.createDeliveryProof(request.body);
      return reply.status(201).send(newDeliveryProof);
    } catch (error) {
      if (error instanceof ServerErrors) {
        return reply
          .status(error.statusCode)
          .send({ message: error.message, details: error.details });
      }
      return reply.status(500).send({ message: "Failed to create delivery proof" });
    }
  },

  /**
   * Handles getting a delivery proof by ID
   */
  async getDeliveryProofByIdHandler(
    request: FastifyRequest<{ Params: DeliveryProofsIdParamsInput }>,
    reply: FastifyReply
  ) {
    try {
      const deliveryProof = request.deliveryProof as DeliveryProofModel;

      if (!deliveryProof) {
        return reply.status(404).send({ message: "Delivery proof not found" });
      }

      return reply.status(200).send(deliveryProof);
    } catch (error) {
      if (error instanceof ServerErrors) {
        return reply
          .status(error.statusCode)
          .send({ message: error.message, details: error.details });
      }
      return reply.status(500).send({ message: "Internal Server Error" });
    }
  },

  /**
   * Handles listing delivery proofs for a shipment
   */
  async listDeliveryProofsByShipmentHandler(
    request: FastifyRequest<{
      Params: { shipmentId: string };
      Querystring: Omit<DeliveryProofsFilterQueryInput, "shipmentId">;
    }>,
    reply: FastifyReply
  ) {
    try {
      const filters: DeliveryProofsFilterQueryInput = {
        ...request.query,
        shipmentId: request.params.shipmentId,
      };

      const limit = Number(request.query.limit) || 10;
      const page = Number(request.query.page) || 1;

      const result = await deliveryProofServices.getAllDeliveryProofs(filters);
      const totalPages = Math.ceil(result.total / limit);

      return reply.status(200).send({
        deliveryProofs: result.deliveryProofs,
        total: result.total,
        page,
        limit,
        totalPages,
      });
    } catch (error) {
      if (error instanceof ServerErrors) {
        return reply
          .status(error.statusCode)
          .send({ message: error.message, details: error.details });
      }
      return reply.status(500).send({ message: "Failed to fetch delivery proofs" });
    }
  },

  /**
   * Handles updating a delivery proof (validation/invalidation)
   */
  async updateDeliveryProofHandler(
    request: FastifyRequest<{
      Params: DeliveryProofsIdParamsInput;
      Body: UpdateDeliveryProofInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const existingProof = request.deliveryProof as DeliveryProofModel;
      if (!existingProof) {
        return reply.status(404).send({ message: "Delivery proof not found" });
      }
      const updatedProof = await deliveryProofServices.updateDeliveryProof(
        request.params,
        request.body
      );
      return reply.status(200).send(updatedProof);
    } catch (error) {
      if (error instanceof ServerErrors) {
        return reply
          .status(error.statusCode)
          .send({ message: error.message, details: error.details });
      }
      return reply.status(500).send({ message: "Failed to update delivery proof" });
    }
  },
};
