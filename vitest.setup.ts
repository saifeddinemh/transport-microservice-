import { vi } from "vitest";

// Mock Kafka modules globally
vi.mock("./src/kafka/producers/transportEventProducer", () => ({
  transportEventProducer: {
    publishDriverCreated: vi.fn().mockResolvedValue(undefined),
    publishDriverUpdated: vi.fn().mockResolvedValue(undefined),
    publishDriverStatusChanged: vi.fn().mockResolvedValue(undefined),
    publishShipmentCreated: vi.fn().mockResolvedValue(undefined),
    publishShipmentStatusUpdated: vi.fn().mockResolvedValue(undefined),
    publishTransportRequestCreated: vi.fn().mockResolvedValue(undefined),
    publishTransportRequestApproved: vi.fn().mockResolvedValue(undefined),
    publishVehicleStatusChanged: vi.fn().mockResolvedValue(undefined),
    publishMaintenanceLogRecorded: vi.fn().mockResolvedValue(undefined),
    publishDeliveryProofRecorded: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("./src/kafka/logger", () => ({
  kafkaLogger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock kafkajs to prevent connection attempts
vi.mock("kafkajs", () => ({
  Kafka: vi.fn().mockImplementation(() => ({
    producer: vi.fn().mockReturnValue({
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      send: vi.fn().mockResolvedValue(undefined),
    }),
    consumer: vi.fn().mockReturnValue({
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockResolvedValue(undefined),
      run: vi.fn().mockResolvedValue(undefined),
    }),
  })),
}));
