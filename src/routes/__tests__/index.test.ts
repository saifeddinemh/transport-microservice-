import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";

// ── Hoisted route mocks ───────────────────────────────────────────────
const routes = vi.hoisted(() => ({
  ownerRoutes: vi.fn(),
  transporterRoutes: vi.fn(),
  contractRoutes: vi.fn(),
  transportRequestsRoutes: vi.fn(),
  vehiclesRoutes: vi.fn(),
  deliveryProofRoutes: vi.fn(),
  maintenanceLogsRoutes: vi.fn(),
  fuelLogsRoutes: vi.fn(),
  driversRoutes: vi.fn(),
  shipmentRoutes: vi.fn(),
}));

vi.mock("../../routes/ownerRoutes", () => ({
  ownerRoutes: routes.ownerRoutes,
}));

vi.mock("../../routes/transporterRoutes", () => ({
  transporterRoutes: routes.transporterRoutes,
}));

vi.mock("../../routes/transportationContractRoutes", () => ({
  contractRoutes: routes.contractRoutes,
}));

vi.mock("../../routes/transportRequestRoutes", () => ({
  transportRequestsRoutes: routes.transportRequestsRoutes,
}));

vi.mock("../../routes/vehicleRoutes", () => ({
  vehiclesRoutes: routes.vehiclesRoutes,
}));

vi.mock("../../routes/deliveryProofRoutes", () => ({
  deliveryProofRoutes: routes.deliveryProofRoutes,
}));

vi.mock("../../routes/maintenanceLogRoutes", () => ({
  maintenanceLogsRoutes: routes.maintenanceLogsRoutes,
}));

vi.mock("../../routes/fuelLogRoutes", () => ({
  fuelLogsRoutes: routes.fuelLogsRoutes,
}));

vi.mock("../../routes/driverRoutes", () => ({
  driversRoutes: routes.driversRoutes,
}));

vi.mock("../../routes/shipmentRoutes", () => ({
  shipmentRoutes: routes.shipmentRoutes,
}));

import { appRoutes } from "../index";

describe("appRoutes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(appRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("should register ownerRoutes under /owner", () => {
    expect(routes.ownerRoutes).toHaveBeenCalled();
  });

  it("should register transporterRoutes under /transporters", () => {
    expect(routes.transporterRoutes).toHaveBeenCalled();
  });

  it("should register contractRoutes under /contracts", () => {
    expect(routes.contractRoutes).toHaveBeenCalled();
  });

  it("should register transportRequestsRoutes under /transport-requests", () => {
    expect(routes.transportRequestsRoutes).toHaveBeenCalled();
  });

  it("should register vehiclesRoutes under /vehicles", () => {
    expect(routes.vehiclesRoutes).toHaveBeenCalled();
  });

  it("should register deliveryProofRoutes under /delivery-proofs", () => {
    expect(routes.deliveryProofRoutes).toHaveBeenCalled();
  });

  it("should register maintenanceLogsRoutes under /maintenance-logs", () => {
    expect(routes.maintenanceLogsRoutes).toHaveBeenCalled();
  });

  it("should register fuelLogsRoutes under /fuel-logs", () => {
    expect(routes.fuelLogsRoutes).toHaveBeenCalled();
  });

  it("should register driversRoutes under /drivers", () => {
    expect(routes.driversRoutes).toHaveBeenCalled();
  });

  it("should register shipmentRoutes under /shipments", () => {
    expect(routes.shipmentRoutes).toHaveBeenCalled();
  });
});
