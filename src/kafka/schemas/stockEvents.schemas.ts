import { z } from "zod";
import { buildEventEnvelopeSchema } from "./envelope.schema.js";

/**
 * Schema for `stockRequest.approved`, published by stock-service (see
 * stock-service/src/kafka/schemas/stockEvents.schemas.ts).
 *
 * NOTE: this payload does NOT include farmId, source, destination, category,
 * or requestDate — so transport-service cannot fully auto-create a
 * TransportRequest from it alone. See stockRequestApprovedHandler.ts.
 */
export const stockRequestApprovedPayloadSchema = z.object({
  stockRequestId: z.string().uuid(),
  stockItemId: z.string().uuid(),
  quantity: z.number(),
  unit: z.string(),
  decidedById: z.string().uuid().optional(),
});
export const stockRequestApprovedEventSchema = buildEventEnvelopeSchema(
  "stockRequest.approved",
  stockRequestApprovedPayloadSchema
);
export type StockRequestApprovedPayload = z.infer<typeof stockRequestApprovedPayloadSchema>;
