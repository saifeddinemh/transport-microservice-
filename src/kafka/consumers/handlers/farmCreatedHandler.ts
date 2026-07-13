import { FarmCreatedPayload } from "../../schemas/hrEvents.schemas.js";
import { kafkaLogger } from "../../logger.js";
import prisma from "../../../utils/prisma.js";

/**
 * Handles `farm.created` events published by hr-service.
 *
 * NOTE: the event payload field is `name`, but transport-service's local
 * Farm model field is `farmName` (see prisma/schema/farm.prisma) — same
 * field name mismatch as hr-service's own Prisma model. Mapped explicitly
 * below; don't "fix" this by renaming the payload field to `farmName` —
 * the event contract (`name`) must stay identical across every consumer.
 */
export async function farmCreatedHandler(payload: FarmCreatedPayload): Promise<void> {
  await prisma.farm.upsert({
    where: { id: payload.farmId },
    create: {
      id: payload.farmId,
      farmName: payload.name,
      ownerId: payload.ownerId,
    },
    update: {
      farmName: payload.name,
      ownerId: payload.ownerId,
    },
  });

  // Link the owner to the farm locally too — every ownership check in this
  // service (verifyFarmOwnership, verifyVehicleOwnership, etc.) queries
  // FarmOwner directly, not Farm.ownerId. Without this, every write on this
  // farm 403s even though the Farm row exists. Requires the Owner row to
  // already exist — i.e. ownerCreatedHandler must have run for this owner.
  await prisma.farmOwner.upsert({
    where: { ownerId_farmId: { ownerId: payload.ownerId, farmId: payload.farmId } },
    create: { ownerId: payload.ownerId, farmId: payload.farmId },
    update: {},
  });

  kafkaLogger.info("farm.created handled", {
    farmId: payload.farmId,
    name: payload.name,
  });
}
