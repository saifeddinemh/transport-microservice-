import { OwnerCreatedPayload } from "../../schemas/hrEvents.schemas.js";
import { kafkaLogger } from "../../logger.js";
import prisma from "../../../utils/prisma.js";

/**
 * Handles `owner.created` events published by hr-service.
 *
 * Mirrors the full HR owner record locally, including the bcrypt hash +
 * salt (never the plaintext password) — same algorithm/pepper as this
 * service's own hashPassword/verifyPassword, so the synced credential
 * actually works for local login too, as long as PEPPER_SECRET_KEY matches
 * hr-service's value. No generated/placeholder data.
 *
 * Must run before/alongside farmCreatedHandler's FarmOwner upsert, or that
 * upsert will fail on the FK.
 */
export async function ownerCreatedHandler(payload: OwnerCreatedPayload): Promise<void> {
  await prisma.owner.upsert({
    where: { id: payload.ownerId },
    create: {
      id: payload.ownerId,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      telephone: payload.telephone,
      birthDate: new Date(payload.birthDate),
      password: payload.password,
      salt: payload.salt,
    },
    update: {
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      telephone: payload.telephone,
      birthDate: new Date(payload.birthDate),
      password: payload.password,
      salt: payload.salt,
    },
  });

  kafkaLogger.info("owner.created handled", {
    ownerId: payload.ownerId,
    email: payload.email,
  });
}
