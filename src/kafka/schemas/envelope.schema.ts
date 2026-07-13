import { z } from "zod";

/**
 * Every event on every topic is wrapped in this envelope:
 *
 * {
 *   "eventId": "uuid",
 *   "eventName": "shipment.created",
 *   "version": "1.0",
 *   "occurredAt": "2026-07-01T10:00:00.000Z",
 *   "source": "transport-service",
 *   "payload": { ... }
 * }
 *
 * `buildEventEnvelopeSchema` binds a specific eventName + payload schema
 * so each event gets its own strict, typed envelope.
 */
export const baseEnvelopeSchema = z.object({
  eventId: z.string().uuid(),
  eventName: z.string(),
  version: z.string(),
  occurredAt: z.string().datetime(),
  source: z.string(),
  payload: z.unknown(),
});

export type BaseEventEnvelope = z.infer<typeof baseEnvelopeSchema>;

export function buildEventEnvelopeSchema<TName extends string, TPayload extends z.ZodTypeAny>(
  eventName: TName,
  payloadSchema: TPayload
) {
  return z.object({
    eventId: z.string().uuid(),
    eventName: z.literal(eventName),
    version: z.string(),
    occurredAt: z.string().datetime(),
    source: z.string(),
    payload: payloadSchema,
  });
}
