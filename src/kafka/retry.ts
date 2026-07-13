import { kafkaConfig } from "./config.js";
import { kafkaLogger } from "./logger.js";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class RetryExhaustedError extends Error {
  constructor(
    message: string,
    public readonly lastError: unknown,
    public readonly attempts: number
  ) {
    super(message);
    this.name = "RetryExhaustedError";
  }
}

/**
 * Runs `handler` up to `maxRetries + 1` times with exponential backoff.
 * Logs every failed attempt. Throws RetryExhaustedError once all attempts
 * are used up, so the caller (the consumer) can route the message to the DLQ.
 */
export async function withRetry<T>(
  handler: () => Promise<T>,
  context: { eventName: string; topic: string; eventId: string },
  options: { maxRetries?: number; initialDelayMs?: number; backoffMultiplier?: number } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? kafkaConfig.retry.maxRetries;
  const initialDelayMs = options.initialDelayMs ?? kafkaConfig.retry.initialDelayMs;
  const backoffMultiplier = options.backoffMultiplier ?? kafkaConfig.retry.backoffMultiplier;

  let attempt = 0;
  let delay = initialDelayMs;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    try {
      return await handler();
    } catch (error) {
      lastError = error;
      attempt += 1;

      kafkaLogger.eventFailed(context.eventName, context.topic, context.eventId, attempt, error);

      if (attempt > maxRetries) break;

      await sleep(delay);
      delay *= backoffMultiplier;
    }
  }

  throw new RetryExhaustedError(
    `Handler for "${context.eventName}" failed after ${attempt} attempt(s)`,
    lastError,
    attempt
  );
}
