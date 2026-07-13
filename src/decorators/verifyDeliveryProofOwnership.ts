import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import prisma from "../utils/prisma";
import type { JwtPayload } from "../types/JwtPayload";
import { mapPrismaDeliveryProofToModel } from "../models/deliveryProofModels";
import type { DeliveryProofsIdParamsInput } from "../schemas/deliveryProofSchemas";

const verifyDeliveryProofOwnership = async (
  request: FastifyRequest<{ Params: DeliveryProofsIdParamsInput }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const proofId = request.params?.id;
    if (!z.string().uuid().safeParse(proofId).success)
      return reply.status(400).send({ message: "Invalid proof ID" });

    const proof = await prisma.deliveryProof.findUnique({
      where: { id: proofId },
      include: { shipment: true },
    });

    if (!proof) return reply.status(404).send({ message: "Proof not found" });

    const owner = request.owner as JwtPayload;
    if (owner.role === "ADMIN") {
      request.deliveryProof = mapPrismaDeliveryProofToModel(proof);
      return;
    }

    const isOwner = await prisma.farmOwner.findFirst({
      where: { ownerId: owner.id, farmId: proof.shipment.farmId },
    });

    if (!isOwner) return reply.status(403).send({ message: "Forbidden" });

    request.deliveryProof = mapPrismaDeliveryProofToModel(proof);
  } catch (_error) {
    return reply.status(500).send({ message: "Internal Server Error" });
  }
};
export default verifyDeliveryProofOwnership;
