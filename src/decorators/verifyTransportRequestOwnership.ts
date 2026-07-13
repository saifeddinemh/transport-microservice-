import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import prisma from "../utils/prisma";
import type { JwtPayload } from "../types/JwtPayload";
import { mapPrismaTransportRequestToModel } from "../models/transportRequestModels";
import type { TransportRequestsIdParamsInput } from "../schemas/transportRequestSchemas";

const verifyTransportRequestOwnership = async (
  request: FastifyRequest<{ Params: TransportRequestsIdParamsInput }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const requestId = request.params?.id;
    if (!z.string().uuid().safeParse(requestId).success) {
      return reply.status(400).send({ message: "Invalid request ID" });
    }

    const transportRequest = await prisma.transportRequest.findUnique({ where: { id: requestId } });
    if (!transportRequest) return reply.status(404).send({ message: "Request not found" });

    const owner = request.owner as JwtPayload;
    if (owner.role === "ADMIN") {
      request.transportRequest = mapPrismaTransportRequestToModel(transportRequest);
      return;
    }

    const isOwner = await prisma.farmOwner.findFirst({
      where: { ownerId: owner.id, farmId: transportRequest.farmId },
    });

    if (!isOwner) return reply.status(403).send({ message: "Forbidden" });

    request.transportRequest = mapPrismaTransportRequestToModel(transportRequest);
  } catch (_error) {
    return reply.status(500).send({ message: "Internal Server Error" });
  }
};
export default verifyTransportRequestOwnership;
