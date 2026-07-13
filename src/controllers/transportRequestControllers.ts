import type { FastifyReply, FastifyRequest } from "fastify";
import { transportRequestsServices } from "../services/transportRequestServices";
import type {
  CreateTransportRequestInput,
  UpdateTransportRequestInput,
  UpdateTransportRequestStatusInput,
  TransportRequestsFilterQueryInput,
  ConvertToInternalShipmentInput,
  ConvertToExternalShipmentInput,
  TransportRequestsIdParamsInput,
} from "../schemas/transportRequestSchemas";
import { ServerErrors } from "../utils/serverErrors";
import type { JwtPayload } from "../types/JwtPayload";
import type { TransportRequestModel } from "../models/transportRequestModels";

export const transportRequestsController = {
  async createTransportRequestHandler(
    request: FastifyRequest<{ Body: CreateTransportRequestInput }>,
    reply: FastifyReply
  ) {
    try {
      const owner = request.owner as JwtPayload;
      if (!owner || !owner.id) {
        return reply.status(401).send({ message: "Authentication required" });
      }

      const newTransportRequest = await transportRequestsServices.createTransportRequest(
        request.body
      );
      return reply.status(201).send(newTransportRequest);
    } catch (error) {
      if (error instanceof ServerErrors) {
        return reply
          .status(error.statusCode)
          .send({ message: error.message, details: error.details });
      }
      return reply.status(500).send({ message: "Failed to create transport request" });
    }
  },

  async getTransportRequestsHandler(
    request: FastifyRequest<{ Querystring: TransportRequestsFilterQueryInput }>,
    reply: FastifyReply
  ) {
    try {
      const result = await transportRequestsServices.getTransportRequests(request.query);
      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof ServerErrors) {
        return reply
          .status(error.statusCode)
          .send({ message: error.message, details: error.details });
      }
      return reply.status(500).send({ message: "Failed to fetch transport requests" });
    }
  },

  async getTransportRequestByIdHandler(
    request: FastifyRequest<{ Params: TransportRequestsIdParamsInput }>,
    reply: FastifyReply
  ) {
    try {
      const transportRequest = request.transportRequest as TransportRequestModel;

      if (!transportRequest) {
        return reply.status(404).send({ message: "Transport request not found" });
      }

      return reply.status(200).send(transportRequest);
    } catch (error) {
      if (error instanceof ServerErrors) {
        return reply
          .status(error.statusCode)
          .send({ message: error.message, details: error.details });
      }
      return reply.status(500).send({ message: "Internal Server Error" });
    }
  },

  async updateTransportRequestHandler(
    request: FastifyRequest<{
      Params: TransportRequestsIdParamsInput;
      Body: UpdateTransportRequestInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const existingReq = request.transportRequest as TransportRequestModel;
      if (!existingReq) return reply.status(404).send({ message: "Transport request not found" });

      const updatedTransportRequest = await transportRequestsServices.updateTransportRequest(
        request.params.id,
        request.body
      );
      return reply.status(200).send(updatedTransportRequest);
    } catch (error) {
      if (error instanceof ServerErrors) {
        return reply
          .status(error.statusCode)
          .send({ message: error.message, details: error.details });
      }
      return reply.status(500).send({ message: "Internal Server Error" });
    }
  },

  async updateTransportRequestStatusHandler(
    request: FastifyRequest<{
      Params: TransportRequestsIdParamsInput;
      Body: UpdateTransportRequestStatusInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const existingReq = request.transportRequest as TransportRequestModel;
      if (!existingReq) return reply.status(404).send({ message: "Transport request not found" });

      const updatedTransportRequest = await transportRequestsServices.updateTransportRequestStatus(
        request.params.id,
        request.body
      );
      return reply.status(200).send(updatedTransportRequest);
    } catch (error) {
      if (error instanceof ServerErrors) {
        return reply
          .status(error.statusCode)
          .send({ message: error.message, details: error.details });
      }
      return reply.status(500).send({ message: "Internal Server Error" });
    }
  },

  async convertToInternalShipmentHandler(
    request: FastifyRequest<{
      Params: TransportRequestsIdParamsInput;
      Body: ConvertToInternalShipmentInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const existingReq = request.transportRequest as TransportRequestModel;
      if (!existingReq) return reply.status(404).send({ message: "Transport request not found" });

      const shipment = await transportRequestsServices.convertToInternalShipment(
        request.params.id,
        request.body
      );
      return reply.status(201).send(shipment);
    } catch (error) {
      if (error instanceof ServerErrors) {
        return reply
          .status(error.statusCode)
          .send({ message: error.message, details: error.details });
      }
      return reply.status(500).send({ message: "Internal Server Error" });
    }
  },

  async convertToExternalShipmentHandler(
    request: FastifyRequest<{
      Params: TransportRequestsIdParamsInput;
      Body: ConvertToExternalShipmentInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const existingReq = request.transportRequest as TransportRequestModel;
      if (!existingReq) return reply.status(404).send({ message: "Transport request not found" });

      const shipment = await transportRequestsServices.convertToExternalShipment(
        request.params.id,
        request.body
      );
      return reply.status(201).send(shipment);
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
