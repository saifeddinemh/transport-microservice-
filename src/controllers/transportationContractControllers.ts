import type { FastifyReply, FastifyRequest } from "fastify";
import { contractServices } from "../services/transportationContractServices";
import type {
  CreateContractInput,
  UpdateContractInput,
  ContractsFilterQueryInput,
  ContractsIdParamsInput,
} from "../schemas/transportationContractSchemas";
import { ServerErrors } from "../utils/serverErrors";
import type { JwtPayload } from "../types/JwtPayload";
import type { TransportationContractModel } from "../models/transportationContractModels";

export const transportationContractController = {
  /**
   * Creates a new transportation contract.
   */
  async createContractHandler(
    request: FastifyRequest<{ Body: CreateContractInput }>,
    reply: FastifyReply
  ) {
    try {
      const owner = request.owner as JwtPayload;
      if (!owner || !owner.id) {
        return reply.status(401).send({ message: "Authentication required" });
      }

      const newContract = await contractServices.createContract(request.body);
      return reply.status(201).send(newContract);
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
   * Retrieves a contract by ID.
   */
  async getContractByIdHandler(
    request: FastifyRequest<{ Params: ContractsIdParamsInput }>,
    reply: FastifyReply
  ) {
    try {
      const contract = request.contract as TransportationContractModel;

      if (!contract) {
        return reply.status(404).send({ message: "Contract not found" });
      }
      return reply.status(200).send(contract);
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
   * Lists contracts by transporter with optional filters.
   */
  async getContractsByTransporterHandler(
    request: FastifyRequest<{
      Params: { transporterId?: string };
      Querystring: Omit<ContractsFilterQueryInput, "transportId">;
    }>,
    reply: FastifyReply
  ) {
    try {
      const filters: ContractsFilterQueryInput = {
        ...request.query,
        transportId: request.params?.transporterId,
        farmId: request.farmId,
      };

      const limit = Number(request.query.limit) || 10;
      const page = Number(request.query.page) || 1;

      const result = await contractServices.getAllContracts(filters);
      const totalPages = Math.ceil(result.total / limit);

      return reply.status(200).send({
        contracts: result.contracts,
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
      return reply.status(500).send({ message: "Internal Server Error" });
    }
  },

  /**
   * Updates an existing contract.
   */
  async updateContractHandler(
    request: FastifyRequest<{
      Params: ContractsIdParamsInput;
      Body: UpdateContractInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const existingContract = request.contract as TransportationContractModel;
      if (!existingContract) {
        return reply.status(404).send({ message: "Contract not found" });
      }

      const updatedContract = await contractServices.updateContract(request.params, request.body);
      return reply.status(200).send(updatedContract);
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
   * Soft deletes a contract (archives it).
   */
  async archiveContractHandler(
    request: FastifyRequest<{ Params: ContractsIdParamsInput }>,
    reply: FastifyReply
  ) {
    try {
      const existingContract = request.contract as TransportationContractModel;
      if (!existingContract) {
        return reply.status(404).send({ message: "Contract not found" });
      }

      const archivedContract = await contractServices.archiveContract(request.params);
      return reply.status(200).send(archivedContract);
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
