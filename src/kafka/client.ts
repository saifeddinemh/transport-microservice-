import { Kafka, type Producer, type Consumer } from "kafkajs";
import { kafkaConfig } from "./config.js";

let producer: Producer | undefined;
let consumer: Consumer | undefined;

export function createKafkaClient() {
  return new Kafka({
    clientId: kafkaConfig.clientId,
    brokers: kafkaConfig.brokers,
  });
}

export async function getProducer(): Promise<Producer> {
  if (!producer) {
    const kafka = createKafkaClient();
    producer = kafka.producer();
    await producer.connect();
  }

  return producer;
}

export function createConsumer(): Consumer {
  if (consumer) {
    return consumer;
  }

  const kafka = createKafkaClient();
  consumer = kafka.consumer({ groupId: kafkaConfig.groupId });
  return consumer;
}
