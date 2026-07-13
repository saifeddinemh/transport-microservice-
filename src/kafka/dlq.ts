import { randomUUID } from "crypto";
import { getProducer } from "./client.js";
import { kafkaConfig } from "./config.js";
import { kafkaLogger } from "./logger.js";

interface DlqMessageInput {
  originalTopic: string;
  eventId: string;
  eventName: string;
  rawMessage: unknown;
  reason: string;
}

// Field names that must never leave this service in plaintext, even inside
// a DLQ envelope. Extend this list if future events carry other secrets.
const SENSITIVE_FIELDS = ["password", "salt"];

const REDACTED = "[REDACTED]";

/**
 * Deep-clones `value` and replaces any object key matching SENSITIVE_FIELDS
 * with a redacted placeholder, at any nesting depth (covers cases like
 * owner.updated's `payload.changes.password`).
 */
function redactSensitiveFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSensitiveFields);
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_FIELDS.includes(key)) {
        result[key] = REDACTED;
      } else {
        result[key] = redactSensitiveFields(val);
      }
    }
    return result;
  }

  return value;
}

/**
 * Publishes a message that could not be processed (invalid payload or
 * handler failure after all retries) to the Dead Letter Queue topic.
 * Never throws — a failure to reach the DLQ is logged but must not crash
 * the consumer loop.
 */
export async function sendToDlq(input: DlqMessageInput): Promise<void> {
  const dlqEnvelope = {
    dlqEventId: randomUUID(),
    originalTopic: input.originalTopic,
    originalEventId: input.eventId,
    originalEventName: input.eventName,
    reason: input.reason,
    failedAt: new Date().toISOString(),
    source: kafkaConfig.source,
    rawMessage: redactSensitiveFields(input.rawMessage),
  };

  try {
    const producer = await getProducer();
    await producer.send({
      topic: kafkaConfig.dlqTopic,
      messages: [{ key: input.eventId, value: JSON.stringify(dlqEnvelope) }],
    });

    kafkaLogger.eventSentToDlq(input.eventName, input.originalTopic, input.eventId, input.reason);
  } catch (error) {
    kafkaLogger.error("Failed to publish message to DLQ", {
      originalTopic: input.originalTopic,
      eventId: input.eventId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
