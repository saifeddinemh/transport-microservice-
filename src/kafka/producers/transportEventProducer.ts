import { randomUUID } from "crypto";
import { z } from "zod";
import { getProducer } from "../client.js";
import { kafkaConfig } from "../config.js";
import { kafkaLogger } from "../logger.js";
import { PRODUCED_TOPICS } from "../topics.js";
import {
  shipmentCreatedEventSchema,
  shipmentCreatedPayloadSchema,
  ShipmentCreatedPayload,
  shipmentStatusUpdatedEventSchema,
  shipmentStatusUpdatedPayloadSchema,
  ShipmentStatusUpdatedPayload,
  deliveryProofRecordedEventSchema,
  deliveryProofRecordedPayloadSchema,
  DeliveryProofRecordedPayload,
  transportRequestCreatedEventSchema,
  transportRequestCreatedPayloadSchema,
  TransportRequestCreatedPayload,
  transportRequestApprovedEventSchema,
  transportRequestApprovedPayloadSchema,
  TransportRequestApprovedPayload,
  vehicleStatusChangedEventSchema,
  vehicleStatusChangedPayloadSchema,
  VehicleStatusChangedPayload,
  maintenanceLogRecordedEventSchema,
  maintenanceLogRecordedPayloadSchema,
  MaintenanceLogRecordedPayload,
  driverCreatedEventSchema,
  driverCreatedPayloadSchema,
  DriverCreatedPayload,
} from "../schemas/transportEvents.schemas.js";

const EVENT_VERSION = "1.0";

/**
 * Builds the standard envelope, validates it against the event's own Zod
 * schema (fail fast — never publish an invalid payload), then sends it to
 * the given topic. `key` is set to the aggregate id for partition ordering.
 */
async function publish<TEnvelope>(params: {
  topic: string;
  eventName: string;
  payload: unknown;
  envelopeSchema: z.ZodType<TEnvelope>;
  key: string;
}): Promise<void> {
  const envelope = {
    eventId: randomUUID(),
    eventName: params.eventName,
    version: EVENT_VERSION,
    occurredAt: new Date().toISOString(),
    source: kafkaConfig.source,
    payload: params.payload,
  };

  // Validate BEFORE sending — invalid payloads are rejected here, not on the wire.
  const validated = params.envelopeSchema.parse(envelope);

  const producer = await getProducer();
  await producer.send({
    topic: params.topic,
    messages: [{ key: params.key, value: JSON.stringify(validated) }],
  });

  kafkaLogger.eventSent(params.eventName, params.topic, envelope.eventId);
}

export const transportEventProducer = {
  async publishShipmentCreated(payload: ShipmentCreatedPayload): Promise<void> {
    const validPayload = shipmentCreatedPayloadSchema.parse(payload);
    await publish({
      topic: PRODUCED_TOPICS.SHIPMENT_CREATED,
      eventName: "shipment.created",
      payload: validPayload,
      envelopeSchema: shipmentCreatedEventSchema,
      key: validPayload.shipmentId,
    });
  },

  async publishShipmentStatusUpdated(payload: ShipmentStatusUpdatedPayload): Promise<void> {
    const validPayload = shipmentStatusUpdatedPayloadSchema.parse(payload);
    await publish({
      topic: PRODUCED_TOPICS.SHIPMENT_STATUS_UPDATED,
      eventName: "shipment.statusUpdated",
      payload: validPayload,
      envelopeSchema: shipmentStatusUpdatedEventSchema,
      key: validPayload.shipmentId,
    });
  },

  async publishDeliveryProofRecorded(payload: DeliveryProofRecordedPayload): Promise<void> {
    const validPayload = deliveryProofRecordedPayloadSchema.parse(payload);
    await publish({
      topic: PRODUCED_TOPICS.DELIVERY_PROOF_RECORDED,
      eventName: "deliveryProof.recorded",
      payload: validPayload,
      envelopeSchema: deliveryProofRecordedEventSchema,
      key: validPayload.deliveryProofId,
    });
  },

  async publishTransportRequestCreated(payload: TransportRequestCreatedPayload): Promise<void> {
    const validPayload = transportRequestCreatedPayloadSchema.parse(payload);
    await publish({
      topic: PRODUCED_TOPICS.TRANSPORT_REQUEST_CREATED,
      eventName: "transportRequest.created",
      payload: validPayload,
      envelopeSchema: transportRequestCreatedEventSchema,
      key: validPayload.transportRequestId,
    });
  },

  async publishTransportRequestApproved(payload: TransportRequestApprovedPayload): Promise<void> {
    const validPayload = transportRequestApprovedPayloadSchema.parse(payload);
    await publish({
      topic: PRODUCED_TOPICS.TRANSPORT_REQUEST_APPROVED,
      eventName: "transportRequest.approved",
      payload: validPayload,
      envelopeSchema: transportRequestApprovedEventSchema,
      key: validPayload.transportRequestId,
    });
  },

  async publishVehicleStatusChanged(payload: VehicleStatusChangedPayload): Promise<void> {
    const validPayload = vehicleStatusChangedPayloadSchema.parse(payload);
    await publish({
      topic: PRODUCED_TOPICS.VEHICLE_STATUS_CHANGED,
      eventName: "vehicle.statusChanged",
      payload: validPayload,
      envelopeSchema: vehicleStatusChangedEventSchema,
      key: validPayload.vehicleId,
    });
  },

  async publishMaintenanceLogRecorded(payload: MaintenanceLogRecordedPayload): Promise<void> {
    const validPayload = maintenanceLogRecordedPayloadSchema.parse(payload);
    await publish({
      topic: PRODUCED_TOPICS.MAINTENANCE_LOG_RECORDED,
      eventName: "maintenanceLog.recorded",
      payload: validPayload,
      envelopeSchema: maintenanceLogRecordedEventSchema,
      key: validPayload.maintenanceLogId,
    });
  },

  async publishDriverCreated(payload: DriverCreatedPayload): Promise<void> {
    const validPayload = driverCreatedPayloadSchema.parse(payload);
    await publish({
      topic: PRODUCED_TOPICS.DRIVER_CREATED,
      eventName: "driver.created",
      payload: validPayload,
      envelopeSchema: driverCreatedEventSchema,
      key: validPayload.driverId,
    });
  },
};
