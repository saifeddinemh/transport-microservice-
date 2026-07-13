import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import prisma from "../utils/prisma";
import type { JwtPayload } from "../types/JwtPayload";
import type { createEmployeeBody, filterEmployeeInput } from "../schemas/employeeSchemas";

const verifyFarmOwnership = async (
  request: FastifyRequest<{
    Params?: { id?: string; farmId?: string };
    Body?: createEmployeeBody;
    Querystring?: filterEmployeeInput;
  }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const bodyFarmId = request.body && "farmId" in request.body ? request.body.farmId : undefined;

    const queryFarmId =
      request.query && "farmId" in request.query ? request.query.farmId : undefined;

    const paramId = request.params?.id || request.params?.farmId || undefined;

    const farmId = bodyFarmId || queryFarmId || paramId;

    const farmIdSchema = z.string().uuid();
    const validation = farmIdSchema.safeParse(farmId);

    if (!validation.success) {
      return reply.status(400).send({
        message: "Missing or invalid farmId in body/query or id in params.",
      });
    }

    const ownerId = (request.owner as JwtPayload).id;

    const isOwner = await prisma.farmOwner.findFirst({
      where: {
        ownerId,
        farmId,
      },
    });

    if (!isOwner) {
      return reply.status(403).send({
        message: "Forbidden: You do not own this farm or farm not found.",
      });
    }

    request.farmId = farmId as string;
  } catch (error) {
    request.log.error(error, "Error in verifyFarmOwnership");
    return reply.status(500).send({ message: "Internal Server Error" });
  }
};

export default verifyFarmOwnership;
