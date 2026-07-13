import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import prisma from "../utils/prisma";
import type { JwtPayload } from "../types/JwtPayload";
import { mapPrismaDriverToModel } from "../models/driverModels";
import type { DriverIdParamsInput } from "../schemas/driverSchemas";

/**
 * Middleware to verify that the authenticated user owns the farm
 * associated with the driver, or is an admin.
 * Attaches the driver to the request object if found and authorized.
 */
const verifyDriverOwnership = async (
  request: FastifyRequest<{ Params: DriverIdParamsInput }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const driverId = request.params?.id;

    const idSchema = z.string().uuid({ message: "Invalid driver ID format" });
    const validation = idSchema.safeParse(driverId);

    if (!validation.success) {
      return reply.status(400).send({ message: "Invalid driver ID format" });
    }

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
    });

    if (!driver) {
      return reply.status(404).send({ message: "Driver not found" });
    }

    const owner = request.owner as JwtPayload;

    if (owner.role === "ADMIN") {
      request.driver = mapPrismaDriverToModel(driver);
      return;
    }

    const farmOwnership = await prisma.farmOwner.findFirst({
      where: {
        ownerId: owner.id,
        farmId: driver.farmId,
      },
    });

    if (!farmOwnership) {
      return reply.status(403).send({
        message: "Forbidden: You don't have permission to access this driver",
      });
    }

    request.driver = mapPrismaDriverToModel(driver);
  } catch (error) {
    request.log.error(error, "Error in verifyDriverOwnership");
    return reply.status(500).send({ message: "Internal Server Error" });
  }
};

export default verifyDriverOwnership;
