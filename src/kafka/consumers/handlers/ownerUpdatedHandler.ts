import { Prisma } from "@prisma/client";
import { OwnerUpdatedPayload } from "../../schemas/hrEvents.schemas.js";
import { kafkaLogger } from "../../logger.js";
import prisma from "../../../utils/prisma.js";

// Defense-in-depth: even though hr-service should only ever send validated
// fields, don't trust the event blindly — only these keys are ever applied
// to the local Owner row, regardless of what's in payload.changes.
const ALLOWED_OWNER_UPDATE_FIELDS = [
  "firstName",
  "lastName",
  "telephone",
  "birthDate",
  "address",
  "country",
  "city",
  "postcode",
  "password",
  "salt",
] as const;

/**
 * Handles `owner.updated` events published by hr-service.
 *
 * `changes` is whatever hr-service sent — a partial profile update, or
 * `{ password, salt }` after a password change. Filtered against an
 * allow-list before being applied; hr-service is the source of truth for
 * what changed, this is just the projection, not a place to trust
 * arbitrary keys.
 */
export async function ownerUpdatedHandler(payload: OwnerUpdatedPayload): Promise<void> {
  const existing = await prisma.owner.findUnique({ where: { id: payload.ownerId } });

  if (!existing) {
    // Update raced ahead of the original owner.created for this id — log
    // and let retry/DLQ handle it rather than silently dropping the change.
    throw new Error(
      `owner.updated received for unknown ownerId=${payload.ownerId}; owner.created may not have been consumed yet`
    );
  }

  const safeChanges = Object.fromEntries(
    Object.entries(payload.changes).filter(([key]) =>
      (ALLOWED_OWNER_UPDATE_FIELDS as readonly string[]).includes(key)
    )
  );

  if (Object.keys(safeChanges).length === 0) {
    kafkaLogger.warn("owner.updated: no allowed fields in payload, skipping", {
      ownerId: payload.ownerId,
      receivedKeys: Object.keys(payload.changes),
    });
    return;
  }

  await prisma.owner.update({
    where: { id: payload.ownerId },
    data: safeChanges as Prisma.OwnerUpdateInput,
  });

  kafkaLogger.info("owner.updated handled", {
    ownerId: payload.ownerId,
    changedFields: Object.keys(safeChanges),
  });
}
