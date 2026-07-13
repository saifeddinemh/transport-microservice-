import type { FastifyReply, FastifyRequest } from "fastify";
import { transporterServices } from "../services/transporterServices";
import type {
  CreateTransporterInput,
  UpdateTransporterInput,
  TransportersFilterQueryInput,
  TransportersIdParamsInput,
} from "../schemas/transporterSchemas";
import { ServerErrors } from "../utils/serverErrors";
import type { JwtPayload } from "../types/JwtPayload";
import type { TransporterModel } from "../models/transporterModels";

export const transporterController = {
  /**
   * Handles creating a new transporter
   */
  async createTransporterHandler(
    request: FastifyRequest<{ Body: CreateTransporterInput }>,
    reply: FastifyReply
  ) {
    try {
      const owner = request.owner as JwtPayload;
      if (!owner || !owner.id) {
        return reply.status(401).send({ message: "Authentication required" });
      }

      const newTransporter = await transporterServices.createTransporter(request.body);
      return reply.status(201).send(newTransporter);
    } catch (error) {
      if (error instanceof ServerErrors) {
        return reply
          .status(error.statusCode)
          .send({ message: error.message, details: error.details });
      }
      return reply.status(500).send({ message: "Failed to create transporter" });
    }
  },

  /**
   * Handles getting all transporters with pagination and filtering
   */
  async getTransportersHandler(
    request: FastifyRequest<{ Querystring: TransportersFilterQueryInput }>,
    reply: FastifyReply
  ) {
    try {
      const farmId = request.farmId;
      const page = Number(request.query.page) || 1;
      const limit = Number(request.query.limit) || 10;

      const filters: TransportersFilterQueryInput = {
        ...request.query,
        page,
        limit,
        farmId,
      };

      const result = await transporterServices.getTransporters(filters);
      const totalPages = Math.ceil(result.total / limit);

      return reply.status(200).send({
        transporters: result.data,
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
      return reply.status(500).send({ message: "Failed to fetch transporters" });
    }
  },

  /**
   * Handles getting a transporter by ID
   */
  async getTransporterByIdHandler(
    request: FastifyRequest<{ Params: TransportersIdParamsInput }>,
    reply: FastifyReply
  ) {
    try {
      const transporter = request.transporter as TransporterModel;

      if (!transporter) {
        return reply.status(404).send({ message: "Transporter not found" });
      }

      return reply.status(200).send(transporter);
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
   * Handles updating a transporter
   */
  async updateTransporterHandler(
    request: FastifyRequest<{
      Params: TransportersIdParamsInput;
      Body: UpdateTransporterInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const existingTransporter = request.transporter as TransporterModel;
      if (!existingTransporter) {
        return reply.status(404).send({ message: "Transporter not found" });
      }

      const updatedTransporter = await transporterServices.updateTransporter(
        request.params,
        request.body
      );

      return reply.status(200).send(updatedTransporter);
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
   * Handles archiving a transporter (soft delete)
   */
  async archiveTransporterHandler(
    request: FastifyRequest<{ Params: TransportersIdParamsInput }>,
    reply: FastifyReply
  ) {
    try {
      const existingTransporter = request.transporter as TransporterModel;
      if (!existingTransporter) {
        return reply.status(404).send({ message: "Transporter not found" });
      }

      const archivedTransporter = await transporterServices.archiveTransporter(request.params);
      return reply.status(200).send(archivedTransporter);
    } catch (error) {
      if (error instanceof ServerErrors) {
        return reply
          .status(error.statusCode)
          .send({ message: error.message, details: error.details });
      }
      return reply.status(500).send({ message: "Internal Server Error" });
    }
  },
};
