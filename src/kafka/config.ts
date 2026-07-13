export const kafkaConfig = {
  source: process.env.KAFKA_SOURCE ?? "transport-service",
  brokers: (process.env.KAFKA_BROKERS ?? "localhost:9092")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  clientId: process.env.KAFKA_CLIENT_ID ?? "transport-service",
  groupId: process.env.KAFKA_GROUP_ID ?? "transport-service-consumers",
  dlqTopic: process.env.KAFKA_DLQ_TOPIC ?? "agrofield.dlq",
  retry: {
    maxRetries: Number(process.env.KAFKA_MAX_RETRIES ?? 3),
    initialDelayMs: Number(process.env.KAFKA_INITIAL_DELAY_MS ?? 250),
    backoffMultiplier: Number(process.env.KAFKA_BACKOFF_MULTIPLIER ?? 2),
  },
};
