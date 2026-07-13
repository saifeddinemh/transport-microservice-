import type { FastifyReply, FastifyRequest } from "fastify";
import { driversServices } from "../services/driverServices";
import type {
  CreateDriverInput,
  DriversFilterQueryInput,
  DriverIdParamsInput,
  UpdateDriverInput,
  UpdateDriverStatusInput,
} from "../schemas/driverSchemas";
import { ServerErrors } from "../utils/serverErrors";
import type { JwtPayload } from "../types/JwtPayload";
import type { DriverModel } from "../models/driverModels";

export const driversController = {
  /**
   * Handles creating a new driver
   */
  async createDriverHandler(
    request: FastifyRequest<{ Body: CreateDriverInput }>,
    reply: FastifyReply
  ) {
    try {
      const owner = request.owner as JwtPayload;

      if (!owner || !owner.id) {
        return reply.status(401).send({ message: "Authentication required" });
      }

      const newDriver = await driversServices.createDriver(request.body);
      return reply.status(201).send(newDriver);
    } catch (error) {
      if (error instanceof ServerErrors) {
        return reply
          .status(error.statusCode)
          .send({ message: error.message, details: error.details });
      }

      return reply.status(500).send({ message: "Failed to create driver" });
    }
  },

  /**
   * Handles getting all drivers with pagination and filtering
   */
  async getDriversHandler(
    request: FastifyRequest<{
      Querystring: DriversFilterQueryInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const farmId = request.farmId;
      const page = Number(request.query.page) || 1;
      const limit = Number(request.query.limit) || 10;

      const filters: DriversFilterQueryInput = {
        ...request.query,
        page,
        limit,
        farmId,
      };

      const { drivers, total } = await driversServices.getAllFarmDrivers(filters);

      const totalPages = Math.ceil(total / limit);

      return reply.status(200).send({
        drivers,
        total,
        page,
        limit,
        totalPages,
      });
    } catch (error) {
      console.error("GET_DRIVERS_ERROR", error);

      if (error instanceof ServerErrors) {
        return reply
          .status(error.statusCode)
          .send({ message: error.message, details: error.details });
      }

      return reply.status(500).send({ message: "Failed to fetch drivers" });
    }
  },

  /**
   * Handles getting a driver by ID
   */
  async getDriverHandler(
    request: FastifyRequest<{ Params: DriverIdParamsInput }>,
    reply: FastifyReply
  ) {
    try {
      const driver = request.driver as DriverModel;

      if (!driver) {
        return reply.status(404).send({ message: "Driver not found" });
      }

      return reply.status(200).send(driver);
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
   * Handles updating a driver
   */
  async updateDriverHandler(
    request: FastifyRequest<{
      Params: DriverIdParamsInput;
      Body: UpdateDriverInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const existingDriver = request.driver as DriverModel;
      if (!existingDriver) {
        return reply.status(404).send({ message: "Driver not found" });
      }

      const updatedDriver = await driversServices.updateDriver(request.params, request.body);

      return reply.status(200).send(updatedDriver);
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
   * Handles updating driver availability status
   */
  async updateDriverStatusHandler(
    request: FastifyRequest<{
      Params: DriverIdParamsInput;
      Body: UpdateDriverStatusInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const existingDriver = request.driver as DriverModel;
      if (!existingDriver) {
        return reply.status(404).send({ message: "Driver not found" });
      }

      const updatedDriver = await driversServices.updateDriverStatus(request.params, request.body);

      return reply.status(200).send(updatedDriver);
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
   * Handles getting driver assigned missions
   */
  async getDriverAssignmentsHandler(
    request: FastifyRequest<{
      Params: DriverIdParamsInput;
      Querystring: { page?: number; limit?: number };
    }>,
    reply: FastifyReply
  ) {
    try {
      const existingDriver = request.driver as DriverModel;
      if (!existingDriver) {
        return reply.status(404).send({ message: "Driver not found" });
      }

      const page = Number(request.query.page) || 1;
      const limit = Number(request.query.limit) || 10;

      const { assignments, total } = await driversServices.getDriverAssignments(
        request.params.id,
        page,
        limit
      );

      const totalPages = Math.ceil(total / limit);

      return reply.status(200).send({
        assignments,
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
