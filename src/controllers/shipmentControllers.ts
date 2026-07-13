import type { FastifyReply, FastifyRequest } from "fastify";
import { shipmentsServices } from "../services/shipmentServices";
import type {
  CreateShipmentInput,
  ShipmentsFilterQueryInput,
  ShipmentIdParamsInput,
  UpdateShipmentInput,
  UpdateShipmentStatusInput,
} from "../schemas/shipmentSchemas";
import { ServerErrors } from "../utils/serverErrors";
import type { JwtPayload } from "../types/JwtPayload";
import type { ShipmentModel } from "../models/shipmentModels";

export const shipmentsController = {
  /**
   * Handles creating a new shipment
   */
  async createShipmentHandler(
    request: FastifyRequest<{ Body: CreateShipmentInput }>,
    reply: FastifyReply
  ) {
    try {
      const owner = request.owner as JwtPayload;

      if (!owner || !owner.id) {
        return reply.status(401).send({ message: "Authentication required" });
      }

      const newShipment = await shipmentsServices.createShipment(request.body);
      return reply.status(201).send(newShipment);
    } catch (error) {
      if (error instanceof ServerErrors) {
        return reply
          .status(error.statusCode)
          .send({ message: error.message, details: error.details });
      }

      return reply.status(500).send({ message: "Failed to create shipment" });
    }
  },

  /**
   * Handles getting all shipments with pagination and filtering
   */
  async getShipmentsHandler(
    request: FastifyRequest<{
      Querystring: ShipmentsFilterQueryInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const farmId = request.farmId;
      const page = Number(request.query.page) || 1;
      const limit = Number(request.query.limit) || 10;

      const filters: ShipmentsFilterQueryInput = {
        ...request.query,
        page,
        limit,
        farmId,
        startDate: request.query.startDate ? new Date(request.query.startDate) : undefined,
        endDate: request.query.endDate ? new Date(request.query.endDate) : undefined,
      };

      const { shipments, total } = await shipmentsServices.getAllFarmShipments(filters);

      const totalPages = Math.ceil(total / limit);

      return reply.status(200).send({
        shipments,
        total,
        page,
        limit,
        totalPages,
      });
    } catch (error) {
      console.error("GET_SHIPMENTS_ERROR", error);

      if (error instanceof ServerErrors) {
        return reply
          .status(error.statusCode)
          .send({ message: error.message, details: error.details });
      }

      return reply.status(500).send({ message: "Failed to fetch shipments" });
    }
  },

  /**
   * Handles getting a shipment by ID
   */
  async getShipmentHandler(
    request: FastifyRequest<{ Params: ShipmentIdParamsInput }>,
    reply: FastifyReply
  ) {
    try {
      const shipment = request.shipment as ShipmentModel;

      if (!shipment) {
        return reply.status(404).send({ message: "Shipment not found" });
      }

      return reply.status(200).send(shipment);
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
   * Handles updating a shipment
   */
  async updateShipmentHandler(
    request: FastifyRequest<{
      Params: ShipmentIdParamsInput;
      Body: UpdateShipmentInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const existingShipment = request.shipment as ShipmentModel;
      if (!existingShipment) {
        return reply.status(404).send({ message: "Shipment not found" });
      }

      const updatedShipment = await shipmentsServices.updateShipment(request.params, request.body);

      return reply.status(200).send(updatedShipment);
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
   * Handles updating shipment status
   */
  async updateShipmentStatusHandler(
    request: FastifyRequest<{
      Params: ShipmentIdParamsInput;
      Body: UpdateShipmentStatusInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const existingShipment = request.shipment as ShipmentModel;
      if (!existingShipment) {
        return reply.status(404).send({ message: "Shipment not found" });
      }

      const updatedShipment = await shipmentsServices.updateShipmentStatus(
        request.params,
        request.body
      );

      return reply.status(200).send(updatedShipment);
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
