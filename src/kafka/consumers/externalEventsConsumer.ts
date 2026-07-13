import { EachMessagePayload } from "kafkajs";
import { z } from "zod";
import { createConsumer } from "../client.js";
import { CONSUMED_TOPICS } from "../topics.js";
import { kafkaLogger } from "../logger.js";
import { withRetry, RetryExhaustedError } from "../retry.js";
import { sendToDlq } from "../dlq.js";
import {
  employeeCreatedEventSchema,
  farmCreatedEventSchema,
  ownerCreatedEventSchema,
  ownerUpdatedEventSchema,
} from "../schemas/hrEvents.schemas.js";
import { stockRequestApprovedEventSchema } from "../schemas/stockEvents.schemas.js";
import { employeeCreatedHandler } from "./handlers/employeeCreatedHandler.js";
import { farmCreatedHandler } from "./handlers/farmCreatedHandler.js";
import { ownerCreatedHandler } from "./handlers/ownerCreatedHandler.js";
import { ownerUpdatedHandler } from "./handlers/ownerUpdatedHandler.js";
import { stockRequestApprovedHandler } from "./handlers/stockRequestApprovedHandler.js";

const consumer = createConsumer();

// Maps each consumed topic (from hr-service AND stock-service) to its
// envelope schema + business handler. One consumer instance, one group,
// subscribed to topics from multiple producing services.
const topicRegistry: Record<
  string,
  { schema: z.ZodTypeAny; handle: (payload: unknown) => Promise<void> }
> = {
  [CONSUMED_TOPICS.OWNER_CREATED]: {
    schema: ownerCreatedEventSchema,
    handle: (payload) => ownerCreatedHandler(payload as never),
  },
  [CONSUMED_TOPICS.OWNER_UPDATED]: {
    schema: ownerUpdatedEventSchema,
    handle: (payload) => ownerUpdatedHandler(payload as never),
  },
  [CONSUMED_TOPICS.EMPLOYEE_CREATED]: {
    schema: employeeCreatedEventSchema,
    handle: (payload) => employeeCreatedHandler(payload as never),
  },
  [CONSUMED_TOPICS.FARM_CREATED]: {
    schema: farmCreatedEventSchema,
    handle: (payload) => farmCreatedHandler(payload as never),
  },
  [CONSUMED_TOPICS.STOCK_REQUEST_APPROVED]: {
    schema: stockRequestApprovedEventSchema,
    handle: (payload) => stockRequestApprovedHandler(payload as never),
  },
};

async function handleMessage({ topic, message }: EachMessagePayload): Promise<void> {
  const rawValue = message.value?.toString() ?? "";
  const registryEntry = topicRegistry[topic];

  if (!registryEntry) {
    kafkaLogger.warn("Received message on unregistered topic", { topic });
    return;
  }

  // 1. Parse JSON
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawValue);
  } catch {
    await sendToDlq({
      originalTopic: topic,
      eventId: "unknown",
      eventName: "unknown",
      rawMessage: rawValue,
      reason: "Malformed JSON payload",
    });
    return;
  }

  const eventId = (parsedJson as { eventId?: string })?.eventId ?? "unknown";
  const eventName = (parsedJson as { eventName?: string })?.eventName ?? "unknown";

  kafkaLogger.eventReceived(eventName, topic, eventId);

  // 2. Validate against the event's Zod schema — invalid payloads go straight to DLQ.
  const validation = registryEntry.schema.safeParse(parsedJson);
  if (!validation.success) {
    await sendToDlq({
      originalTopic: topic,
      eventId,
      eventName,
      rawMessage: parsedJson,
      reason: `Schema validation failed: ${validation.error.message}`,
    });
    return;
  }

  const envelope = validation.data as { payload: unknown };

  // 3. Run the business handler with retry; anything left after retries → DLQ.
  try {
    await withRetry(() => registryEntry.handle(envelope.payload), { eventName, topic, eventId });
    kafkaLogger.eventProcessed(eventName, topic, eventId);
  } catch (error) {
    const reason =
      error instanceof RetryExhaustedError
        ? `Handler failed after ${error.attempts} attempt(s): ${
            error.lastError instanceof Error ? error.lastError.message : String(error.lastError)
          }`
        : error instanceof Error
          ? error.message
          : String(error);

    await sendToDlq({
      originalTopic: topic,
      eventId,
      eventName,
      rawMessage: parsedJson,
      reason,
    });
  }
}

export async function startExternalEventsConsumer(): Promise<void> {
  await consumer.connect();
  await consumer.subscribe({
    topics: Object.values(CONSUMED_TOPICS),
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: handleMessage,
  });

  kafkaLogger.info("HR/Stock events consumer started", {
    topics: Object.values(CONSUMED_TOPICS),
  });
}

export async function stopExternalEventsConsumer(): Promise<void> {
  await consumer.disconnect();
  kafkaLogger.info("HR/Stock events consumer stopped");
}
