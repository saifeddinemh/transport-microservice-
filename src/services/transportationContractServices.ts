import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";
import type { TransportationContractModel } from "../models/transportationContractModels";
import { mapPrismaTransportationContractToModel } from "../models/transportationContractModels";
import type {
  CreateContractInput,
  UpdateContractInput,
  ContractsFilterQueryInput,
  ContractsIdParamsInput,
} from "../schemas/transportationContractSchemas";
import {
  createContractSchema,
  updateContractSchema,
  contractsFilterQuerySchema,
  ContractsIdParamsSchema,
} from "../schemas/transportationContractSchemas";
import { ServerErrors } from "../utils/serverErrors";
import { z } from "zod";

/**
 * Service module for managing transportation contract operations in the system.
 */
export const contractServices = {
  /**
   * Creates a new transportation contract in the database.
   * Validates that there are no overlapping date ranges for the same transporter.
   */
  async createContract(data: CreateContractInput): Promise<TransportationContractModel> {
    try {
      const validatedData = createContractSchema.parse(data);

      await contractServices.checkOverlap(
        validatedData.transportId,
        validatedData.startDate,
        validatedData.endDate || undefined
      );

      const transport = await prisma.transport.findUnique({
        where: { id: validatedData.transportId },
      });

      if (!transport) {
        throw new ServerErrors("Transport provider not found", 404);
      }

      const newContract = await prisma.transportationContract.create({
        data: validatedData,
      });

      return mapPrismaTransportationContractToModel(newContract);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ServerErrors("A contract with the same details already exists.", 409);
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
   * Retrieves a contract by its ID.
   */
  async getContractById(data: ContractsIdParamsInput): Promise<TransportationContractModel | null> {
    try {
      const parsedId = ContractsIdParamsSchema.safeParse(data);
      if (!parsedId.success) {
        throw new ServerErrors("Invalid contract ID", 400, parsedId.error);
      }

      const contract = await prisma.transportationContract.findFirst({
        where: { id: data.id, isArchived: false },
      });

      return contract ? mapPrismaTransportationContractToModel(contract) : null;
    } catch (error) {
      if (error instanceof ServerErrors) throw error;
      throw new ServerErrors("An unexpected error occurred", 500, error);
    }
  },

  /**
   * Lists contracts with pagination and optional filters.
   */
  async getAllContracts(
    filters: ContractsFilterQueryInput
  ): Promise<{ contracts: TransportationContractModel[]; total: number }> {
    try {
      const validatedFilters = contractsFilterQuerySchema.parse(filters);

      const {
        transportId,
        status,
        contractType,
        startDate,
        endDate,
        page = 1,
        limit = 10,
        nested = false,
      } = validatedFilters;

      const where: Prisma.TransportationContractWhereInput = {
        isArchived: false,
        ...(transportId && { transportId }),
        ...(status && { status }),
        ...(contractType && { contractType }),
      };

      // Filter by active at a specific date range if provided
      if (startDate && endDate) {
        where.startDate = { lte: endDate };
        where.OR = [{ endDate: null }, { endDate: { gte: startDate } }];
      }

      const total = await prisma.transportationContract.count({ where });

      const contracts = await prisma.transportationContract.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startDate: "desc" },
        include: nested ? { transport: true } : undefined,
      });

      return {
        contracts: contracts.map(mapPrismaTransportationContractToModel),
        total,
      };
    } catch (error) {
      throw new ServerErrors("Failed to fetch contracts", 500, error);
    }
  },

  /**
   * Updates an existing contract.
   */
  async updateContract(
    id: ContractsIdParamsInput,
    data: UpdateContractInput
  ): Promise<TransportationContractModel> {
    try {
      const validatedData = updateContractSchema.parse(data);

      const existingContract = await prisma.transportationContract.findFirst({
        where: { id: id.id, isArchived: false },
      });

      if (!existingContract) {
        throw new ServerErrors("Contract not found", 404);
      }

      const checkStartDate = validatedData.startDate || existingContract.startDate;
      const checkEndDate =
        validatedData.endDate !== undefined ? validatedData.endDate : existingContract.endDate;
      const checkTransportId = validatedData.transportId || existingContract.transportId;

      if (
        validatedData.startDate ||
        validatedData.endDate !== undefined ||
        validatedData.transportId
      ) {
        await contractServices.checkOverlap(
          checkTransportId,
          checkStartDate,
          checkEndDate || undefined,
          id.id
        );
      }

      const updatedContract = await prisma.transportationContract.update({
        where: { id: id.id },
        data: validatedData,
      });

      return mapPrismaTransportationContractToModel(updatedContract);
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
   * Soft deletes a contract by setting isArchived to true.
   */
  async archiveContract(id: ContractsIdParamsInput): Promise<TransportationContractModel> {
    try {
      const parsedId = ContractsIdParamsSchema.safeParse(id);
      if (!parsedId.success) {
        throw new ServerErrors("Invalid contract ID", 400, parsedId.error);
      }

      const existingContract = await prisma.transportationContract.findFirst({
        where: { id: id.id, isArchived: false },
      });

      if (!existingContract) {
        throw new ServerErrors("Contract not found or already archived", 404);
      }

      const archivedContract = await prisma.transportationContract.update({
        where: { id: id.id },
        data: {
          isArchived: true,
          status: "INACTIVE",
        },
      });

      return mapPrismaTransportationContractToModel(archivedContract);
    } catch (error) {
      if (error instanceof ServerErrors) throw error;
      throw new ServerErrors("An unexpected error occurred", 500, error);
    }
  },

  /**
   * Checks if a new/updated contract overlaps with existing contracts for the same transporter.
   */
  async checkOverlap(
    transportId: string,
    startDate: Date,
    endDate?: Date,
    excludeContractId?: string
  ): Promise<void> {
    try {
      const where: Prisma.TransportationContractWhereInput = {
        transportId,
        isArchived: false,
        id: excludeContractId ? { not: excludeContractId } : undefined,
      };

      const overlappingContracts = await prisma.transportationContract.findMany({
        where: {
          ...where,
          OR: [
            { endDate: null, startDate: { lte: endDate || new Date("2100-01-01") } },
            endDate ? {} : { startDate: { lte: new Date("2100-01-01") } },
            endDate ? { startDate: { lte: endDate }, endDate: { gte: startDate } } : {},
          ].filter((condition) => Object.keys(condition).length > 0),
        },
      });

      if (overlappingContracts.length > 0) {
        throw new ServerErrors(
          "Contract date range overlaps with an existing contract for this transporter",
          409
        );
      }
    } catch (error) {
      if (error instanceof ServerErrors) throw error;
      throw new ServerErrors("Error checking contract overlap", 500, error);
    }
  },
};
