import type { FastifyReply, FastifyRequest } from "fastify";
import { fuelLogsServices } from "../services/fuelLogServices";
import type {
  CreateFuelLogInput,
  UpdateFuelLogInput,
  FuelLogIdParamsInput,
  FuelLogsFilterQueryInput,
  ConsumptionStatsQueryInput,
  CostStatsQueryInput,
  VehicleIdParamsInput,
} from "../schemas/fuelLogSchemas";
import { ServerErrors } from "../utils/serverErrors";
import type { JwtPayload } from "../types/JwtPayload";
import type { FuelLogModel } from "../models/fuelLogsModels";

export const fuelLogsController = {
  /**
   * Handles creating a new fuel log entry
   */
  async createFuelLogHandler(
    request: FastifyRequest<{ Body: CreateFuelLogInput }>,
    reply: FastifyReply
  ) {
    try {
      const owner = request.owner as JwtPayload;

      if (!owner || !owner.id) {
        return reply.status(401).send({ message: "Authentication required" });
      }

      const newFuelLog = await fuelLogsServices.createFuelLog(request.body);
      return reply.status(201).send(newFuelLog);
    } catch (error) {
      if (error instanceof ServerErrors) {
        return reply
          .status(error.statusCode)
          .send({ message: error.message, details: error.details });
      }

      return reply.status(500).send({ message: "Failed to create fuel log" });
    }
  },

  /**
   * Handles getting all fuel logs with filtering and pagination
   */
  async getFuelLogsHandler(
    request: FastifyRequest<{ Querystring: FuelLogsFilterQueryInput }>,
    reply: FastifyReply
  ) {
    try {
      const farmId = request.farmId as string;
      const page = Number(request.query.page) || 1;
      const limit = Number(request.query.limit) || 10;

      const filters: FuelLogsFilterQueryInput = {
        ...request.query,
        page,
        limit,
        farmId,
        startDate: request.query.startDate ? new Date(request.query.startDate) : undefined,
        endDate: request.query.endDate ? new Date(request.query.endDate) : undefined,
      };

      const { fuelLogs, total } = await fuelLogsServices.getFuelLogs(filters);
      const totalPages = Math.ceil(total / limit);

      return reply.status(200).send({
        fuelLogs,
        total,
        page,
        limit,
        totalPages,
      });
    } catch (error) {
      console.error("GET_FUEL_LOGS_ERROR", error);

      if (error instanceof ServerErrors) {
        return reply
          .status(error.statusCode)
          .send({ message: error.message, details: error.details });
      }

      return reply.status(500).send({ message: "Failed to fetch fuel logs" });
    }
  },

  /**
   * Handles getting fuel logs for a specific vehicle
   */
  async getVehicleFuelHistoryHandler(
    request: FastifyRequest<{
      Params: VehicleIdParamsInput;
      Querystring: Omit<FuelLogsFilterQueryInput, "vehicleId">;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { vehicleId } = request.params;
      const farmId = request.farmId as string;
      const page = Number(request.query.page) || 1;
      const limit = Number(request.query.limit) || 10;

      const filters: Omit<FuelLogsFilterQueryInput, "vehicleId"> = {
        ...request.query,
        page,
        limit,
        farmId,
        startDate: request.query.startDate ? new Date(request.query.startDate) : undefined,
        endDate: request.query.endDate ? new Date(request.query.endDate) : undefined,
      };

      const { fuelLogs, total } = await fuelLogsServices.getVehicleFuelHistory(vehicleId, filters);
      const totalPages = Math.ceil(total / limit);

      return reply.status(200).send({
        fuelLogs,
        total,
        page,
        limit,
        totalPages,
      });
    } catch (error) {
      console.error("GET_VEHICLE_FUEL_HISTORY_ERROR", error);

      if (error instanceof ServerErrors) {
        return reply
          .status(error.statusCode)
          .send({ message: error.message, details: error.details });
      }

      return reply.status(500).send({ message: "Failed to fetch vehicle fuel history" });
    }
  },

  /**
   * Handles updating a fuel log entry
   */
  async updateFuelLogHandler(
    request: FastifyRequest<{
      Params: FuelLogIdParamsInput;
      Body: UpdateFuelLogInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const updatedFuelLog = await fuelLogsServices.updateFuelLog(request.params, request.body);

      return reply.status(200).send(updatedFuelLog);
    } catch (error) {
      if (error instanceof ServerErrors) {
        return reply
          .status(error.statusCode)
          .send({ message: error.message, details: error.details });
      }
      return reply.status(500).send({ message: "Failed to update fuel log" });
    }
  },

  /**
   * Handles getting consumption statistics
   */
  async getConsumptionStatsHandler(
    request: FastifyRequest<{ Querystring: ConsumptionStatsQueryInput }>,
    reply: FastifyReply
  ) {
    try {
      const farmId = request.farmId as string;

      const stats = await fuelLogsServices.getConsumptionStats({
        ...request.query,
        farmId,
      });

      return reply.status(200).send(stats);
    } catch (error) {
      if (error instanceof ServerErrors) {
        return reply
          .status(error.statusCode)
          .send({ message: error.message, details: error.details });
      }
      return reply.status(500).send({ message: "Failed to generate consumption stats" });
    }
  },

  /**
   * Handles getting cost statistics
   */
  async getCostStatsHandler(
    request: FastifyRequest<{ Querystring: CostStatsQueryInput }>,
    reply: FastifyReply
  ) {
    try {
      const farmId = request.farmId as string;

      const stats = await fuelLogsServices.getCostStats({
        ...request.query,
        farmId,
      });

      return reply.status(200).send(stats);
    } catch (error) {
      if (error instanceof ServerErrors) {
        return reply
          .status(error.statusCode)
          .send({ message: error.message, details: error.details });
      }
      return reply.status(500).send({ message: "Failed to generate cost stats" });
    }
  },

  /**
   * Handles getting a specific fuel log by ID
   */
  async getFuelLogHandler(
    request: FastifyRequest<{ Params: FuelLogIdParamsInput }>,
    reply: FastifyReply
  ) {
    try {
      const fuelLog = request.fuelLog as FuelLogModel;

      if (!fuelLog) {
        return reply.status(404).send({ message: "Fuel log not found" });
      }

      return reply.status(200).send(fuelLog);
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
