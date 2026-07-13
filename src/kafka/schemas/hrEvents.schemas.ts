import { z } from "zod";
import { buildEventEnvelopeSchema } from "./envelope.schema.js";

/**
 * Schemas for events published by hr-service that transport-service
 * consumes. These mirror hr-service's contract exactly (see
 * hr-service/src/kafka/schemas/eventSchemas.ts) — same shape used by
 * stock-service's consumer.
 */

// ─────────────────────────────────────────────
// owner.created (produced by hr-service)
// ─────────────────────────────────────────────
export const ownerCreatedPayloadSchema = z.object({
  ownerId: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  telephone: z.string(),
  birthDate: z.string(),
  password: z.string(),
  salt: z.string(),
});
export const ownerCreatedEventSchema = buildEventEnvelopeSchema(
  "owner.created",
  ownerCreatedPayloadSchema
);
export type OwnerCreatedPayload = z.infer<typeof ownerCreatedPayloadSchema>;

export const ownerUpdatedPayloadSchema = z.object({
  ownerId: z.string().uuid(),
  changes: z.record(z.unknown()),
  updatedAt: z.string().datetime(),
});
export const ownerUpdatedEventSchema = buildEventEnvelopeSchema(
  "owner.updated",
  ownerUpdatedPayloadSchema
);
export type OwnerUpdatedPayload = z.infer<typeof ownerUpdatedPayloadSchema>;

// ─────────────────────────────────────────────
// employee.created (produced by hr-service)
// ─────────────────────────────────────────────
export const employeeCreatedPayloadSchema = z.object({
  employeeId: z.string().uuid(),
  farmId: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.string(),
  email: z.string().email().nullable().optional(),
});
export const employeeCreatedEventSchema = buildEventEnvelopeSchema(
  "employee.created",
  employeeCreatedPayloadSchema
);
export type EmployeeCreatedPayload = z.infer<typeof employeeCreatedPayloadSchema>;

// ─────────────────────────────────────────────
// farm.created (produced by hr-service)
// ─────────────────────────────────────────────
export const farmCreatedPayloadSchema = z.object({
  farmId: z.string().uuid(),
  name: z.string(),
  ownerId: z.string().uuid(),
});
export const farmCreatedEventSchema = buildEventEnvelopeSchema(
  "farm.created",
  farmCreatedPayloadSchema
);
export type FarmCreatedPayload = z.infer<typeof farmCreatedPayloadSchema>;
