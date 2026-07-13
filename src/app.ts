import { createServer } from "./utils/createServer";
import { getProducer } from "./kafka/client.js";
import {
  startExternalEventsConsumer,
  stopExternalEventsConsumer,
} from "./kafka/consumers/externalEventsConsumer.js";
import { kafkaLogger } from "./kafka/logger.js";

async function startServer() {
  try {
    const fastify = await createServer();

    // Connect the Kafka producer and start consuming HR/stock events before
    // accepting HTTP traffic, so nothing is dropped.
    await getProducer();
    await startExternalEventsConsumer();

    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST || "0.0.0.0";

    await fastify.listen({ port, host });
    console.warn(`🚀 Server running at http://${host}:${port}`);

    const shutdown = async (signal: string) => {
      kafkaLogger.info(`Received ${signal}, shutting down gracefully`);
      try {
        await fastify.close();
        await stopExternalEventsConsumer();
      } catch (err) {
        console.error("Error during shutdown:", err);
      } finally {
        process.exit(0);
      }
    };

    process.on("SIGTERM", () => void shutdown("SIGTERM"));
    process.on("SIGINT", () => void shutdown("SIGINT"));
  } catch (err) {
    console.error("❌ Error starting server:", err);
    process.exit(1);
  }
}

void startServer();
