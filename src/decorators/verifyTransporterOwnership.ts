import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import prisma from "../utils/prisma";
import type { JwtPayload } from "../types/JwtPayload";
import { mapPrismaTransporterToModel } from "../models/transporterModels";

const verifyTransporterOwnership = async (
  request: FastifyRequest<{
    Params?: { id?: string; transporterId?: string };
    Body?: { transportId?: string };
    Querystring?: { transportId?: string };
  }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const paramId = request.params?.id || request.params?.transporterId;
    const bodyId = request.body?.transportId;
    const queryId = request.query?.transportId;

    const transporterId = paramId || bodyId || queryId;

    const validation = z.string().uuid().safeParse(transporterId);

    if (!validation.success) return reply.status(400).send({ message: "Invalid transporter ID" });

    const transporter = await prisma.transport.findUnique({ where: { id: transporterId } });
    if (!transporter) return reply.status(404).send({ message: "Transporter not found" });

    const owner = request.owner as JwtPayload;
    if (owner.role === "ADMIN") {
      request.transporter = mapPrismaTransporterToModel(transporter);
      return;
    }

    const isOwner = await prisma.farmOwner.findFirst({
      where: { ownerId: owner.id, farmId: transporter.farmId },
    });

    if (!isOwner) return reply.status(403).send({ message: "Forbidden" });

    request.transporter = mapPrismaTransporterToModel(transporter);
  } catch (_error) {
    return reply.status(500).send({ message: "Internal Server Error" });
  }
};
export default verifyTransporterOwnership;
