import type { FastifyReply, FastifyRequest } from "fastify";
import { vehiclesServices } from "../services/vehicleServices";
import type {
  CreateVehicleInput,
  VehiclesFilterQueryInput,
  VehiclesIdParamsInput,
  UpdateVehicleInput,
  UpdateVehicleStatusInput,
} from "../schemas/vehiclesSchemas";
import { ServerErrors } from "../utils/serverErrors";
import type { JwtPayload } from "../types/JwtPayload";
import type { VehicleModel } from "../models/vehicleModels";

export const vehiclesController = {
  /**
   * Handles creating a new vehicle
   */
  async createVehicleHandler(
    request: FastifyRequest<{ Body: CreateVehicleInput }>,
    reply: FastifyReply
  ) {
    try {
      const owner = request.owner as JwtPayload;

      if (!owner || !owner.id) {
        return reply.status(401).send({ message: "Authentication required" });
      }

      const newVehicle = await vehiclesServices.createVehicle(request.body);
      return reply.status(201).send(newVehicle);
    } catch (error) {
      if (error instanceof ServerErrors) {
        return reply
          .status(error.statusCode)
          .send({ message: error.message, details: error.details });
      }

      return reply.status(500).send({ message: "Failed to create vehicle" });
    }
  },

  /**
   * Handles getting all vehicles with pagination and filtering
   */
  async getVehiclesHandler(
    request: FastifyRequest<{
      Querystring: VehiclesFilterQueryInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const farmId = request.farmId;
      const page = Number(request.query.page) || 1;
      const limit = Number(request.query.limit) || 10;

      const filters: VehiclesFilterQueryInput = {
        ...request.query,
        page,
        limit,
        farmId,
      };

      const { vehicles, total } = await vehiclesServices.getAllFarmVehicles(filters);
      const totalPages = Math.ceil(total / limit);

      return reply.status(200).send({
        vehicles,
        total,
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

      return reply.status(500).send({ message: "Failed to fetch vehicles" });
    }
  },

  /**
   * Handles getting a vehicle by ID
   */
  async getVehicleHandler(
    request: FastifyRequest<{ Params: VehiclesIdParamsInput }>,
    reply: FastifyReply
  ) {
    try {
      const vehicle = request.vehicle as VehicleModel;

      if (!vehicle) {
        return reply.status(404).send({ message: "Vehicle not found" });
      }

      return reply.status(200).send(vehicle);
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
   * Handles updating a vehicle
   */
  async updateVehicleHandler(
    request: FastifyRequest<{
      Params: VehiclesIdParamsInput;
      Body: UpdateVehicleInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const existingVehicle = request.vehicle as VehicleModel;
      if (!existingVehicle) {
        return reply.status(404).send({ message: "Vehicle not found" });
      }

      const updatedVehicle = await vehiclesServices.updateVehicle(request.params, request.body);

      return reply.status(200).send(updatedVehicle);
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
   * Handles updating vehicle status
   */
  async updateVehicleStatusHandler(
    request: FastifyRequest<{
      Params: VehiclesIdParamsInput;
      Body: UpdateVehicleStatusInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const existingVehicle = request.vehicle as VehicleModel;
      if (!existingVehicle) {
        return reply.status(404).send({ message: "Vehicle not found" });
      }

      const updatedVehicle = await vehiclesServices.updateVehicleStatus(
        request.params,
        request.body
      );

      return reply.status(200).send(updatedVehicle);
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
   * Handles getting vehicle maintenance history
   */
  async getVehicleMaintenanceHandler(
    request: FastifyRequest<{
      Params: VehiclesIdParamsInput;
      Querystring: { page?: number; limit?: number };
    }>,
    reply: FastifyReply
  ) {
    try {
      const existingVehicle = request.vehicle as VehicleModel;
      if (!existingVehicle) {
        return reply.status(404).send({ message: "Vehicle not found" });
      }

      const page = Number(request.query.page) || 1;
      const limit = Number(request.query.limit) || 10;

      const { maintenance, total } = await vehiclesServices.getVehicleMaintenanceHistory(
        request.params.id,
        page,
        limit
      );

      const totalPages = Math.ceil(total / limit);

      return reply.status(200).send({
        maintenance,
        total,
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
      return reply.status(500).send({ message: "Internal Server Error" });
    }
  },

  /**
   * Handles getting vehicle fuel consumption history
   */
  async getVehicleFuelHandler(
    request: FastifyRequest<{
      Params: VehiclesIdParamsInput;
      Querystring: { page?: number; limit?: number };
    }>,
    reply: FastifyReply
  ) {
    try {
      const existingVehicle = request.vehicle as VehicleModel;
      if (!existingVehicle) {
        return reply.status(404).send({ message: "Vehicle not found" });
      }

      const page = Number(request.query.page) || 1;
      const limit = Number(request.query.limit) || 10;

      const { fuelLogs, total } = await vehiclesServices.getVehicleFuelHistory(
        request.params.id,
        page,
        limit
      );

      const totalPages = Math.ceil(total / limit);

      return reply.status(200).send({
        fuelLogs,
        total,
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
      return reply.status(500).send({ message: "Internal Server Error" });
    }
  },
};
