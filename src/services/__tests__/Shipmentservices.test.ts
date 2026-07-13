import { describe, expect, it, vi, beforeEach } from "vitest";
import { shipmentsServices } from "../shipmentServices";
import prisma from "../../utils/prisma";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

vi.mock("../../utils/prisma", () => ({
  default: {
    shipment: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    vehicle: {
      findFirst: vi.fn(),
    },
    driver: {
      findFirst: vi.fn(),
    },
    transport: {
      findFirst: vi.fn(),
    },
  },
}));

const farmId = "22222222-2222-2222-2222-222222222222";
const requestId = "33333333-3333-3333-3333-333333333333";
const shipmentId = "11111111-1111-1111-1111-111111111111";

const basePrismaShipment = {
  id: shipmentId,
  status: "PENDING",
  startLocation: "Casablanca",
  endLocation: "Marrakesh",
  wayPoints: [],
  totalWeight: 500,
  distanceKm: 250,
  totalCost: 1000,
  estimatedArrival: new Date("2024-04-01T10:00:00Z"),
  requestId,
  farmId,
  vehicleId: null,
  driverId: null,
  transportId: null,
  createdAt: new Date("2024-03-01T10:00:00Z"),
  updatedAt: new Date("2024-03-01T10:00:00Z"),
};

const validCreateInput = {
  startLocation: "Casablanca",
  endLocation: "Marrakesh",
  totalWeight: 500,
  totalCost: 1000,
  estimatedArrival: "2024-04-01",
  requestId,
  farmId,
};

describe("shipmentsServices.createShipment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a shipment and returns the mapped model", async () => {
    (prisma.shipment.findUnique as any).mockResolvedValue(null);
    (prisma.shipment.create as any).mockResolvedValue(basePrismaShipment);

    const result = await shipmentsServices.createShipment(validCreateInput as any);

    expect(prisma.shipment.create).toHaveBeenCalled();
    expect(result.id).toBe(shipmentId);
  });

  it("throws a 409 ServerErrors when a shipment already exists for the request", async () => {
    (prisma.shipment.findUnique as any).mockResolvedValue(basePrismaShipment);

    await expect(shipmentsServices.createShipment(validCreateInput as any)).rejects.toMatchObject({
      statusCode: 409,
      message: "A shipment already exists for this transport request",
    });
    expect(prisma.shipment.create).not.toHaveBeenCalled();
  });

  it("throws a 400 ServerErrors when the given vehicle is unavailable", async () => {
    (prisma.shipment.findUnique as any).mockResolvedValue(null);
    (prisma.vehicle.findFirst as any).mockResolvedValue(null);

    await expect(
      shipmentsServices.createShipment({
        ...validCreateInput,
        vehicleId: "44444444-4444-4444-4444-444444444444",
      } as any)
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.shipment.create).not.toHaveBeenCalled();
  });

  it("throws a 400 ServerErrors when the given driver is inactive", async () => {
    (prisma.shipment.findUnique as any).mockResolvedValue(null);
    (prisma.driver.findFirst as any).mockResolvedValue(null);

    await expect(
      shipmentsServices.createShipment({
        ...validCreateInput,
        driverId: "44444444-4444-4444-4444-444444444444",
      } as any)
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.shipment.create).not.toHaveBeenCalled();
  });

  it("throws a 400 ServerErrors when the given transport company is inactive", async () => {
    (prisma.shipment.findUnique as any).mockResolvedValue(null);
    (prisma.transport.findFirst as any).mockResolvedValue(null);

    await expect(
      shipmentsServices.createShipment({
        ...validCreateInput,
        transportId: "44444444-4444-4444-4444-444444444444",
      } as any)
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.shipment.create).not.toHaveBeenCalled();
  });

  it("throws a 400 ServerErrors when validation fails", async () => {
    await expect(
      shipmentsServices.createShipment({ startLocation: "A" } as any)
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("shipmentsServices.getAllFarmShipments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated shipments", async () => {
    (prisma.shipment.count as any).mockResolvedValue(1);
    (prisma.shipment.findMany as any).mockResolvedValue([basePrismaShipment]);

    const result = await shipmentsServices.getAllFarmShipments({ farmId } as any);

    expect(result.total).toBe(1);
    expect(result.shipments[0].id).toBe(shipmentId);
  });

  it("wraps failures as a 500 ServerErrors", async () => {
    (prisma.shipment.count as any).mockRejectedValue(new Error("db down"));

    await expect(shipmentsServices.getAllFarmShipments({ farmId } as any)).rejects.toMatchObject({
      statusCode: 500,
      message: "Failed to fetch shipments",
    });
  });
});

describe("shipmentsServices.getShipmentById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the mapped shipment when found", async () => {
    (prisma.shipment.findUnique as any).mockResolvedValue(basePrismaShipment);

    const result = await shipmentsServices.getShipmentById({ id: shipmentId });

    expect(result?.id).toBe(shipmentId);
  });

  it("returns null when not found", async () => {
    (prisma.shipment.findUnique as any).mockResolvedValue(null);

    const result = await shipmentsServices.getShipmentById({ id: shipmentId });

    expect(result).toBeNull();
  });

  it("throws a 400 ServerErrors for an invalid ID", async () => {
    await expect(
      shipmentsServices.getShipmentById({ id: "not-a-uuid" } as any)
    ).rejects.toMatchObject({ statusCode: 400, message: "Invalid shipment ID" });
  });
});

describe("shipmentsServices.updateShipment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates a shipment that is still in an editable status", async () => {
    (prisma.shipment.findUnique as any).mockResolvedValue(basePrismaShipment);
    (prisma.shipment.update as any).mockResolvedValue({
      ...basePrismaShipment,
      totalWeight: 800,
    });

    const result = await shipmentsServices.updateShipment({ id: shipmentId }, {
      totalWeight: 800,
    } as any);

    expect(result.totalWeight).toBe(800);
  });

  it("throws a 404 ServerErrors when the shipment does not exist", async () => {
    (prisma.shipment.findUnique as any).mockResolvedValue(null);

    await expect(
      shipmentsServices.updateShipment({ id: shipmentId }, { totalWeight: 800 } as any)
    ).rejects.toMatchObject({ statusCode: 404, message: "Shipment not found" });
  });

  it("throws a 400 ServerErrors when the shipment is already DELIVERED", async () => {
    (prisma.shipment.findUnique as any).mockResolvedValue({
      ...basePrismaShipment,
      status: "DELIVERED",
    });

    await expect(
      shipmentsServices.updateShipment({ id: shipmentId }, { totalWeight: 800 } as any)
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.shipment.update).not.toHaveBeenCalled();
  });

  it("maps a Prisma P2025 error to a 404 ServerErrors", async () => {
    (prisma.shipment.findUnique as any).mockResolvedValue(basePrismaShipment);
    (prisma.shipment.update as any).mockRejectedValue(
      new PrismaClientKnownRequestError("Record not found", {
        code: "P2025",
        clientVersion: "6.5.0",
      })
    );

    await expect(
      shipmentsServices.updateShipment({ id: shipmentId }, { totalWeight: 800 } as any)
    ).rejects.toMatchObject({ statusCode: 404, message: "Shipment to update does not exist." });
  });
});

describe("shipmentsServices.updateShipmentStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows a valid status transition", async () => {
    (prisma.shipment.findUnique as any).mockResolvedValue(basePrismaShipment);
    (prisma.shipment.update as any).mockResolvedValue({
      ...basePrismaShipment,
      status: "PLANNED",
    });

    const result = await shipmentsServices.updateShipmentStatus({ id: shipmentId }, {
      status: "PLANNED",
    } as any);

    expect(result.status).toBe("PLANNED");
  });

  it("throws a 400 ServerErrors for an invalid status transition", async () => {
    (prisma.shipment.findUnique as any).mockResolvedValue({
      ...basePrismaShipment,
      status: "DELIVERED",
    });

    await expect(
      shipmentsServices.updateShipmentStatus({ id: shipmentId }, { status: "PENDING" } as any)
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.shipment.update).not.toHaveBeenCalled();
  });

  it("throws a 404 ServerErrors when the shipment does not exist", async () => {
    (prisma.shipment.findUnique as any).mockResolvedValue(null);

    await expect(
      shipmentsServices.updateShipmentStatus({ id: shipmentId }, { status: "PLANNED" } as any)
    ).rejects.toMatchObject({ statusCode: 404, message: "Shipment not found" });
  });
});

describe("shipmentsServices.getShipmentWithRelations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the shipment with nested relations mapped", async () => {
    (prisma.shipment.findUnique as any).mockResolvedValue({
      ...basePrismaShipment,
      vehicle: null,
      driver: null,
      transport: null,
      transportRequest: null,
      deliveryProofs: [],
    });

    const result = await shipmentsServices.getShipmentWithRelations({ id: shipmentId });

    expect(result?.id).toBe(shipmentId);
  });

  it("returns null when not found", async () => {
    (prisma.shipment.findUnique as any).mockResolvedValue(null);

    const result = await shipmentsServices.getShipmentWithRelations({ id: shipmentId });

    expect(result).toBeNull();
  });

  it("throws a 400 ServerErrors for an invalid ID", async () => {
    await expect(
      shipmentsServices.getShipmentWithRelations({ id: "not-a-uuid" } as any)
    ).rejects.toMatchObject({ statusCode: 400, message: "Invalid shipment ID" });
  });
});
