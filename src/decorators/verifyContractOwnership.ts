import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import prisma from "../utils/prisma";
import type { JwtPayload } from "../types/JwtPayload";
import { mapPrismaTransportationContractToModel } from "../models/transportationContractModels";
import type { ContractsIdParamsInput } from "../schemas/transportationContractSchemas";

const verifyContractOwnership = async (
  request: FastifyRequest<{ Params: ContractsIdParamsInput }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const contractId = request.params?.id;
    const validation = z.string().uuid().safeParse(contractId);

    if (!validation.success) return reply.status(400).send({ message: "Invalid contract ID" });

    const contract = await prisma.transportationContract.findUnique({
      where: { id: contractId },
      include: { transport: true },
    });

    if (!contract) return reply.status(404).send({ message: "Contract not found" });

    const owner = request.owner as JwtPayload;
    if (owner.role === "ADMIN") {
      request.contract = mapPrismaTransportationContractToModel(contract);
      return;
    }

    const isOwner = await prisma.farmOwner.findFirst({
      where: { ownerId: owner.id, farmId: contract.transport.farmId },
    });

    if (!isOwner) return reply.status(403).send({ message: "Forbidden" });

    request.contract = mapPrismaTransportationContractToModel(contract);
  } catch (_error) {
    return reply.status(500).send({ message: "Internal Server Error" });
  }
};
export default verifyContractOwnership;
