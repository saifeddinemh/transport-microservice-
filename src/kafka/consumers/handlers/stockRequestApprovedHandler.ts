import { StockRequestApprovedPayload } from "../../schemas/stockEvents.schemas.js";
import { kafkaLogger } from "../../logger.js";

/**
 * Handles `stockRequest.approved` events published by stock-service.
 *
 * INTENT (not yet implemented): auto-create a TransportRequest when an
 * approved stock request needs delivering to/from a farm.
 *
 * BLOCKED: TransportRequest requires farmId, ownerId, source, destination,
 * category, weight and requestDate — but stock-service's stockRequest.approved
 * payload only carries stockRequestId, stockItemId, quantity, unit and
 * decidedById. There isn't enough information here to create a valid
 * TransportRequest. Either:
 *   (a) stock-service enriches this event's payload with farmId (and ideally
 *       a pickup/destination address), or
 *   (b) this stays a manual step — someone reads the stock request and
 *       creates the transport request themselves.
 * Until (a) happens, this stays log-only.
 */
export async function stockRequestApprovedHandler(
  payload: StockRequestApprovedPayload
): Promise<void> {
  kafkaLogger.info("stockRequest.approved handled (log-only — see file header)", {
    stockRequestId: payload.stockRequestId,
    stockItemId: payload.stockItemId,
    quantity: payload.quantity,
  });
}
