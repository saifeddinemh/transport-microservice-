import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import prisma from "../utils/prisma";
import type { JwtPayload } from "../types/JwtPayload";
import { mapPrismaFuelLogToModel } from "../models/fuelLogsModels";
import type { FuelLogIdParamsInput } from "../schemas/fuelLogSchemas";

const verifyFuelLogOwnership = async (
  request: FastifyRequest<{ Params: FuelLogIdParamsInput }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const logId = request.params?.id;
    if (!z.string().uuid().safeParse(logId).success)
      return reply.status(400).send({ message: "Invalid log ID" });

    const log = await prisma.fuelLog.findUnique({
      where: { id: logId },
      include: { vehicle: true },
    });

    if (!log) return reply.status(404).send({ message: "Fuel log not found" });

    const owner = request.owner as JwtPayload;
    if (owner.role === "ADMIN") {
      request.fuelLog = mapPrismaFuelLogToModel(log);
      return;
    }

    const isOwner = await prisma.farmOwner.findFirst({
      where: { ownerId: owner.id, farmId: log.vehicle.farmId },
    });

    if (!isOwner) return reply.status(403).send({ message: "Forbidden" });

    request.fuelLog = mapPrismaFuelLogToModel(log);
  } catch (_error) {
    return reply.status(500).send({ message: "Internal Server Error" });
  }
};
export default verifyFuelLogOwnership;
