import { z } from "zod";
import { buildEventEnvelopeSchema } from "./envelope.schema.js";

// ─────────────────────────────────────────────
// shipment.created
// ─────────────────────────────────────────────
export const shipmentCreatedPayloadSchema = z.object({
  shipmentId: z.string().uuid(),
  requestId: z.string().uuid(),
  farmId: z.string().uuid(),
  status: z.string(),
  startLocation: z.string(),
  endLocation: z.string(),
  totalWeight: z.number(),
  totalCost: z.number(),
  estimatedArrival: z.string().datetime(),
  vehicleId: z.string().uuid().nullable().optional(),
  driverId: z.string().uuid().nullable().optional(),
  transportId: z.string().uuid().nullable().optional(),
});
export const shipmentCreatedEventSchema = buildEventEnvelopeSchema(
  "shipment.created",
  shipmentCreatedPayloadSchema
);
export type ShipmentCreatedPayload = z.infer<typeof shipmentCreatedPayloadSchema>;

// ─────────────────────────────────────────────
// shipment.statusUpdated
// ─────────────────────────────────────────────
export const shipmentStatusUpdatedPayloadSchema = z.object({
  shipmentId: z.string().uuid(),
  farmId: z.string().uuid(),
  previousStatus: z.string(),
  newStatus: z.string(),
});
export const shipmentStatusUpdatedEventSchema = buildEventEnvelopeSchema(
  "shipment.statusUpdated",
  shipmentStatusUpdatedPayloadSchema
);
export type ShipmentStatusUpdatedPayload = z.infer<typeof shipmentStatusUpdatedPayloadSchema>;

// ─────────────────────────────────────────────
// deliveryProof.recorded
// ─────────────────────────────────────────────
export const deliveryProofRecordedPayloadSchema = z.object({
  deliveryProofId: z.string().uuid(),
  shipmentId: z.string().uuid(),
  recipientName: z.string(),
  receivedAt: z.string().datetime(),
  isValid: z.boolean(),
});
export const deliveryProofRecordedEventSchema = buildEventEnvelopeSchema(
  "deliveryProof.recorded",
  deliveryProofRecordedPayloadSchema
);
export type DeliveryProofRecordedPayload = z.infer<typeof deliveryProofRecordedPayloadSchema>;

// ─────────────────────────────────────────────
// transportRequest.created
// ─────────────────────────────────────────────
export const transportRequestCreatedPayloadSchema = z.object({
  transportRequestId: z.string().uuid(),
  farmId: z.string().uuid(),
  ownerId: z.string().uuid(),
  employeeId: z.string().uuid().nullable().optional(),
  source: z.string(),
  destination: z.string(),
  category: z.string(),
  weight: z.number(),
  requestDate: z.string().datetime(),
});
export const transportRequestCreatedEventSchema = buildEventEnvelopeSchema(
  "transportRequest.created",
  transportRequestCreatedPayloadSchema
);
export type TransportRequestCreatedPayload = z.infer<typeof transportRequestCreatedPayloadSchema>;

// ─────────────────────────────────────────────
// transportRequest.approved
// ─────────────────────────────────────────────
export const transportRequestApprovedPayloadSchema = z.object({
  transportRequestId: z.string().uuid(),
  farmId: z.string().uuid(),
  status: z.literal("APPROVED"),
});
export const transportRequestApprovedEventSchema = buildEventEnvelopeSchema(
  "transportRequest.approved",
  transportRequestApprovedPayloadSchema
);
export type TransportRequestApprovedPayload = z.infer<typeof transportRequestApprovedPayloadSchema>;

// ─────────────────────────────────────────────
// vehicle.statusChanged
// ─────────────────────────────────────────────
export const vehicleStatusChangedPayloadSchema = z.object({
  vehicleId: z.string().uuid(),
  farmId: z.string().uuid(),
  previousStatus: z.string(),
  newStatus: z.string(),
});
export const vehicleStatusChangedEventSchema = buildEventEnvelopeSchema(
  "vehicle.statusChanged",
  vehicleStatusChangedPayloadSchema
);
export type VehicleStatusChangedPayload = z.infer<typeof vehicleStatusChangedPayloadSchema>;

// ─────────────────────────────────────────────
// maintenanceLog.recorded
// ─────────────────────────────────────────────
export const maintenanceLogRecordedPayloadSchema = z.object({
  maintenanceLogId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  maintenanceType: z.string(),
  cost: z.number(),
  date: z.string().datetime(),
});
export const maintenanceLogRecordedEventSchema = buildEventEnvelopeSchema(
  "maintenanceLog.recorded",
  maintenanceLogRecordedPayloadSchema
);
export type MaintenanceLogRecordedPayload = z.infer<typeof maintenanceLogRecordedPayloadSchema>;

// ─────────────────────────────────────────────
// driver.created
// ─────────────────────────────────────────────
export const driverCreatedPayloadSchema = z.object({
  driverId: z.string().uuid(),
  farmId: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  licenseNumber: z.string(),
});
export const driverCreatedEventSchema = buildEventEnvelopeSchema(
  "driver.created",
  driverCreatedPayloadSchema
);
export type DriverCreatedPayload = z.infer<typeof driverCreatedPayloadSchema>;
