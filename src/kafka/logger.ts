import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const logFilePath = resolve(process.cwd(), "logs", "kafka.log");

function formatMeta(meta?: Record<string, unknown>) {
  if (!meta || Object.keys(meta).length === 0) {
    return "";
  }

  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return ` ${String(meta)}`;
  }
}

function writeToFile(
  level: "info" | "warn" | "error",
  message: string,
  meta?: Record<string, unknown>
) {
  try {
    mkdirSync(dirname(logFilePath), { recursive: true });
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${level}] [kafka] ${message}${formatMeta(meta)}\n`;
    appendFileSync(logFilePath, line, "utf8");
  } catch (error) {
    console.error("[kafka] failed to write to log file", error);
  }
}

export const kafkaLogger = {
  info(message: string, meta?: Record<string, unknown>) {
    console.info(`[kafka] ${message}`, meta ?? {});
    writeToFile("info", message, meta);
  },
  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(`[kafka] ${message}`, meta ?? {});
    writeToFile("warn", message, meta);
  },
  error(message: string, meta?: Record<string, unknown>) {
    console.error(`[kafka] ${message}`, meta ?? {});
    writeToFile("error", message, meta);
  },
  eventReceived(eventName: string, topic: string, eventId: string) {
    this.info("event received", { eventName, topic, eventId });
  },
  eventProcessed(eventName: string, topic: string, eventId: string) {
    this.info("event processed", { eventName, topic, eventId });
  },
  eventSent(eventName: string, topic: string, eventId: string) {
    this.info("event sent", { eventName, topic, eventId });
  },
  eventSentToDlq(eventName: string, topic: string, eventId: string, reason: string) {
    this.warn("event sent to DLQ", { eventName, topic, eventId, reason });
  },
  eventFailed(eventName: string, topic: string, eventId: string, attempt: number, error: unknown) {
    this.warn("event failed", { eventName, topic, eventId, attempt, error });
  },
};
