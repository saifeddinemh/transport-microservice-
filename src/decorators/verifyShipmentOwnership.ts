import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import prisma from "../utils/prisma";
import type { JwtPayload } from "../types/JwtPayload";
import { mapPrismaShipmentToModel } from "../models/shipmentModels";

const verifyShipmentOwnership = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const shipmentId =
      (request.params as any)?.id ??
      (request.params as any)?.shipmentId ??
      (request.body as any)?.shipmentId;

    const idSchema = z.string().uuid({ message: "Invalid shipment ID format" });
    const validation = idSchema.safeParse(shipmentId);

    if (!validation.success) {
      return reply.status(400).send({ message: "Invalid shipment ID format" });
    }

    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
    });

    if (!shipment) {
      return reply.status(404).send({ message: "Shipment not found" });
    }

    const owner = request.owner as JwtPayload;

    if (owner.role === "ADMIN") {
      request.shipment = mapPrismaShipmentToModel(shipment);
      return;
    }

    const farmOwnership = await prisma.farmOwner.findFirst({
      where: {
        ownerId: owner.id,
        farmId: shipment.farmId,
      },
    });

    if (!farmOwnership) {
      return reply.status(403).send({
        message: "Forbidden: You don't have permission to access this shipment",
      });
    }

    request.shipment = mapPrismaShipmentToModel(shipment);
  } catch (error) {
    request.log.error(error, "Error in verifyShipmentOwnership");
    return reply.status(500).send({ message: "Internal Server Error" });
  }
};

export default verifyShipmentOwnership;
