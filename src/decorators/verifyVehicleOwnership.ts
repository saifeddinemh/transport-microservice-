import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import prisma from "../utils/prisma";
import type { JwtPayload } from "../types/JwtPayload";
import { mapPrismaVehicleToModel } from "../models/vehicleModels";

const verifyVehicleOwnership = async (
  request: FastifyRequest<{
    Params?: { id?: string; vehicleId?: string };
    Body?: { vehicleId?: string };
    Querystring?: { vehicleId?: string };
  }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const paramId = request.params?.id || request.params?.vehicleId;
    const bodyId = request.body?.vehicleId;
    const queryId = request.query?.vehicleId;

    const vehicleId = paramId || bodyId || queryId;

    const idSchema = z.string().uuid({ message: "Invalid vehicle ID format" });
    const validation = idSchema.safeParse(vehicleId);

    if (!validation.success) {
      return reply.status(400).send({ message: "Invalid vehicle ID format" });
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      return reply.status(404).send({ message: "Vehicle not found" });
    }

    const owner = request.owner as JwtPayload;

    const farmOwnership = await prisma.farmOwner.findFirst({
      where: {
        ownerId: owner.id,
        farmId: vehicle.farmId,
      },
    });

    if (!farmOwnership) {
      return reply.status(403).send({
        message: "Forbidden: You don't have permission to access this vehicle",
      });
    }

    request.vehicle = mapPrismaVehicleToModel(vehicle);
  } catch (error) {
    request.log.error(error, "Error in verifyVehicleOwnership");
    return reply.status(500).send({ message: "Internal Server Error" });
  }
};

export default verifyVehicleOwnership;
