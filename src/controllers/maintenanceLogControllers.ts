import type { FastifyReply, FastifyRequest } from "fastify";
import { maintenanceLogServices } from "../services/maintenanceLogServices";
import type {
  CreateMaintenanceLogInput,
  UpdateMaintenanceLogInput,
  GetMaintenanceStatsQueryInput,
  MaintenanceLogsFilterQueryInput,
  MaintenanceLogsIdParamsInput,
} from "../schemas/maintenanceLogSchemas";
import { ServerErrors } from "../utils/serverErrors";
import type { JwtPayload } from "../types/JwtPayload";
import type { MaintenanceLogModel } from "../models/maintenanceLogsModels";

export const maintenanceLogController = {
  /**
   * Handles creating a new maintenance log
   */
  async createMaintenanceLogHandler(
    request: FastifyRequest<{ Body: CreateMaintenanceLogInput }>,
    reply: FastifyReply
  ) {
    try {
      const owner = request.owner as JwtPayload;
      if (!owner || !owner.id) {
        return reply.status(401).send({ message: "Authentication required" });
      }

      const newLog = await maintenanceLogServices.createMaintenanceLog(request.body);
      return reply.status(201).send(newLog);
    } catch (error) {
      if (error instanceof ServerErrors) {
        return reply
          .status(error.statusCode)
          .send({ message: error.message, details: error.details });
      }
      return reply.status(500).send({ message: "Failed to create maintenance log" });
    }
  },

  /**
   * Handles getting a maintenance log by ID
   */
  async getMaintenanceLogByIdHandler(
    request: FastifyRequest<{ Params: MaintenanceLogsIdParamsInput }>,
    reply: FastifyReply
  ) {
    try {
      const log = request.maintenanceLog as MaintenanceLogModel;

      if (!log) {
        return reply.status(404).send({ message: "Maintenance log not found" });
      }

      return reply.status(200).send(log);
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
   * Handles getting maintenance history for a vehicle
   */
  async getVehicleMaintenanceHistoryHandler(
    request: FastifyRequest<{
      Params: { vehicleId: string };
      Querystring: Omit<MaintenanceLogsFilterQueryInput, "vehicleId">;
    }>,
    reply: FastifyReply
  ) {
    try {
      const filters: MaintenanceLogsFilterQueryInput = {
        ...request.query,
        vehicleId: request.params.vehicleId,
        farmId: request.farmId,
      };

      const limit = Number(request.query.limit) || 10;
      const page = Number(request.query.page) || 1;

      const result = await maintenanceLogServices.getMaintenanceLogsByVehicle(filters);
      const totalPages = Math.ceil(result.total / limit);

      return reply.status(200).send({
        maintenanceLogs: result.data,
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
      return reply.status(500).send({ message: "Failed to fetch maintenance logs" });
    }
  },

  /**
   * Handles getting maintenance stats
   */
  async getMaintenanceStatsHandler(
    request: FastifyRequest<{ Querystring: GetMaintenanceStatsQueryInput }>,
    reply: FastifyReply
  ) {
    try {
      const _queryParams = {
        ...request.query,
        farmId: request.farmId,
      };

      const stats = await maintenanceLogServices.getMaintenanceStats(request.query);
      return reply.status(200).send(stats);
    } catch (error) {
      if (error instanceof ServerErrors) {
        return reply
          .status(error.statusCode)
          .send({ message: error.message, details: error.details });
      }
      return reply.status(500).send({ message: "Failed to compute stats" });
    }
  },

  /**
   * Handles updating a maintenance log
   */
  async updateMaintenanceLogHandler(
    request: FastifyRequest<{
      Params: MaintenanceLogsIdParamsInput;
      Body: UpdateMaintenanceLogInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const existingLog = request.maintenanceLog as MaintenanceLogModel;
      if (!existingLog) {
        return reply.status(404).send({ message: "Maintenance log not found" });
      }

      const updatedLog = await maintenanceLogServices.updateMaintenanceLog(
        request.params,
        request.body
      );
      return reply.status(200).send(updatedLog);
    } catch (error) {
      if (error instanceof ServerErrors) {
        return reply
          .status(error.statusCode)
          .send({ message: error.message, details: error.details });
      }
      return reply.status(500).send({ message: "Failed to update maintenance log" });
    }
  },
};
