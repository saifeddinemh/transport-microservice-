export const TRANSPORT_TOPICS = {
  shipmentCreated: "agrofield.transport.shipment.created",
  shipmentStatusUpdated: "agrofield.transport.shipment.statusUpdated",
  deliveryProofRecorded: "agrofield.transport.deliveryProof.recorded",
  transportRequestCreated: "agrofield.transport.request.created",
  transportRequestApproved: "agrofield.transport.request.approved",
  vehicleStatusChanged: "agrofield.transport.vehicle.statusChanged",
  maintenanceLogRecorded: "agrofield.transport.maintenance.recorded",
  driverCreated: "agrofield.transport.driver.created",
} as const;

export const CONSUMED_TOPICS = {
  // Must match the real topic names published by hr-service
  // (see hr-service/src/kafka/topics/index.ts).
  OWNER_CREATED: "agrofield.owner.created",
  OWNER_UPDATED: "agrofield.owner.updated",
  EMPLOYEE_CREATED: "agrofield.employee.created",
  FARM_CREATED: "agrofield.farm.created",
  // Must match stock-service (see stock-service/src/kafka/topics.ts).
  // Optional link: only useful once transport auto-creates a
  // TransportRequest from an approved stock request — see the note in
  // stockRequestApprovedHandler.ts before relying on this.
  STOCK_REQUEST_APPROVED: "agrofield.stock.request.approved",
} as const;

export const PRODUCED_TOPICS = {
  SHIPMENT_CREATED: TRANSPORT_TOPICS.shipmentCreated,
  SHIPMENT_STATUS_UPDATED: TRANSPORT_TOPICS.shipmentStatusUpdated,
  DELIVERY_PROOF_RECORDED: TRANSPORT_TOPICS.deliveryProofRecorded,
  TRANSPORT_REQUEST_CREATED: TRANSPORT_TOPICS.transportRequestCreated,
  TRANSPORT_REQUEST_APPROVED: TRANSPORT_TOPICS.transportRequestApproved,
  VEHICLE_STATUS_CHANGED: TRANSPORT_TOPICS.vehicleStatusChanged,
  MAINTENANCE_LOG_RECORDED: TRANSPORT_TOPICS.maintenanceLogRecorded,
  DRIVER_CREATED: TRANSPORT_TOPICS.driverCreated,
} as const;

export const DLQ_TOPIC = "agrofield.dlq";
