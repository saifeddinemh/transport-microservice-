import { describe, expect, it, vi, beforeEach } from "vitest";
import { driversServices } from "../driverServices";
import prisma from "../../utils/prisma";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

vi.mock("../../utils/prisma", () => ({
  default: {
    driver: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    shipment: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

const farmId = "22222222-2222-2222-2222-222222222222";
const driverId = "11111111-1111-1111-1111-111111111111";

const basePrismaDriver = {
  id: driverId,
  name: "Karim Aziz",
  email: "karim@agrofield.com",
  phoneNumber: "0600000000",
  licenseNumber: "LIC-001",
  experienceYears: 5,
  status: "ACTIVE" as const,
  farmId,
  isArchived: false,
  createdAt: new Date("2024-01-01T10:00:00Z"),
  updatedAt: new Date("2024-01-02T10:00:00Z"),
};

const validCreateInput = {
  name: "Karim Aziz",
  email: "karim@agrofield.com",
  phoneNumber: "0600000000",
  licenseNumber: "LIC-001",
  experienceYears: 5,
  status: "ACTIVE" as const,
  farmId,
};

// Full shipment shape required by mapPrismaShipmentToModel
const basePrismaShipment = {
  id: "ship-1",
  status: "PENDING" as const,
  startLocation: "A",
  endLocation: "B",
  wayPoints: [],
  totalWeight: 100,
  distanceKm: 10,
  totalCost: 50,
  estimatedArrival: new Date("2024-04-01T10:00:00Z"),
  requestId: "req-1",
  farmId,
  vehicleId: null,
  driverId,
  transportId: null,
  createdAt: new Date("2024-01-01T10:00:00Z"),
  updatedAt: new Date("2024-01-02T10:00:00Z"),
};

describe("driversServices.createDriver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a driver and returns the mapped model", async () => {
    vi.mocked(prisma.driver.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.driver.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.driver.create).mockResolvedValue(basePrismaDriver);

    const result = await driversServices.createDriver(validCreateInput);

    expect(prisma.driver.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: "karim@agrofield.com" }),
    });
    expect(result.id).toBe(driverId);
  });

  it("throws a 409 ServerErrors when the email already exists", async () => {
    vi.mocked(prisma.driver.findUnique).mockResolvedValue(basePrismaDriver);

    await expect(driversServices.createDriver(validCreateInput)).rejects.toMatchObject({
      statusCode: 409,
      message: "A driver with this email already exists",
    });
    expect(prisma.driver.create).not.toHaveBeenCalled();
  });

  it("throws a 409 ServerErrors when the license number already exists in the farm", async () => {
    vi.mocked(prisma.driver.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.driver.findFirst).mockResolvedValue(basePrismaDriver);

    await expect(driversServices.createDriver(validCreateInput)).rejects.toMatchObject({
      statusCode: 409,
      message: "A driver with this license number already exists in the farm",
    });
    expect(prisma.driver.create).not.toHaveBeenCalled();
  });

  it("throws a 400 ServerErrors when validation fails", async () => {
    await expect(driversServices.createDriver({ name: "" } as any)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("wraps unexpected errors as a 500 ServerErrors", async () => {
    vi.mocked(prisma.driver.findUnique).mockRejectedValue(new Error("db down"));

    await expect(driversServices.createDriver(validCreateInput)).rejects.toMatchObject({
      statusCode: 500,
    });
  });
});

describe("driversServices.getAllFarmDrivers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated drivers with the default (non-nested) mapping", async () => {
    vi.mocked(prisma.driver.count).mockResolvedValue(1);
    vi.mocked(prisma.driver.findMany).mockResolvedValue([basePrismaDriver]);

    const result = await driversServices.getAllFarmDrivers({
      farmId,
      nested: false,
      page: 1,
      limit: 10,
    });

    expect(prisma.driver.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 10 })
    );
    expect(result.total).toBe(1);
    expect(result.drivers[0].id).toBe(driverId);
  });

  it("applies search filters as an OR clause", async () => {
    vi.mocked(prisma.driver.count).mockResolvedValue(0);
    vi.mocked(prisma.driver.findMany).mockResolvedValue([]);

    await driversServices.getAllFarmDrivers({
      farmId,
      search: "karim",
      nested: false,
      page: 1,
      limit: 10,
    });

    const callArgs = vi.mocked(prisma.driver.findMany).mock.calls[0]?.[0];

    expect(callArgs?.where?.OR).toEqual(
      expect.arrayContaining([
        {
          name: {
            contains: "karim",
            mode: "insensitive",
          },
        },
      ])
    );
  });

  it("wraps failures as a 500 ServerErrors", async () => {
    vi.mocked(prisma.driver.count).mockRejectedValue(new Error("db down"));

    await expect(
      driversServices.getAllFarmDrivers({
        farmId,
        nested: false,
        page: 1,
        limit: 10,
      })
    ).rejects.toMatchObject({
      statusCode: 500,
      message: "Failed to fetch drivers",
    });
  });
});
describe("driversServices.getDriverById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the mapped driver when found", async () => {
    vi.mocked(prisma.driver.findUnique).mockResolvedValue(basePrismaDriver);

    const result = await driversServices.getDriverById({ id: driverId });

    expect(result?.id).toBe(driverId);
  });

  it("returns null when the driver does not exist", async () => {
    vi.mocked(prisma.driver.findUnique).mockResolvedValue(null);

    const result = await driversServices.getDriverById({ id: driverId });

    expect(result).toBeNull();
  });

  it("throws a 400 ServerErrors for an invalid ID", async () => {
    await expect(driversServices.getDriverById({ id: "not-a-uuid" } as any)).rejects.toMatchObject({
      statusCode: 400,
      message: "Invalid driver ID",
    });
  });
});

describe("driversServices.updateDriver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates a driver with no conflicting fields", async () => {
    vi.mocked(prisma.driver.findUnique).mockResolvedValue(basePrismaDriver);
    vi.mocked(prisma.driver.update).mockResolvedValue({
      ...basePrismaDriver,
      name: "New Name",
    });

    const result = await driversServices.updateDriver({ id: driverId }, { name: "New Name" });

    expect(result.name).toBe("New Name");
  });

  it("throws a 404 ServerErrors when the driver does not exist", async () => {
    vi.mocked(prisma.driver.findUnique).mockResolvedValue(null);

    await expect(
      driversServices.updateDriver({ id: driverId }, { name: "New Name" })
    ).rejects.toMatchObject({ statusCode: 404, message: "Driver not found" });
  });

  it("throws a 409 ServerErrors when the new email is already used", async () => {
    vi.mocked(prisma.driver.findUnique)
      .mockResolvedValueOnce(basePrismaDriver)
      .mockResolvedValueOnce({ ...basePrismaDriver, id: "other-id" });

    await expect(
      driversServices.updateDriver({ id: driverId }, { email: "taken@agrofield.com" })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("throws a 409 ServerErrors when the new license number is already used in the farm", async () => {
    vi.mocked(prisma.driver.findUnique).mockResolvedValue(basePrismaDriver);
    vi.mocked(prisma.driver.findFirst).mockResolvedValue({
      ...basePrismaDriver,
      id: "other-id",
    });

    await expect(
      driversServices.updateDriver({ id: driverId }, { licenseNumber: "LIC-999" })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("maps a Prisma P2025 error to a 404 ServerErrors", async () => {
    vi.mocked(prisma.driver.findUnique).mockResolvedValue(basePrismaDriver);
    vi.mocked(prisma.driver.update).mockRejectedValue(
      new PrismaClientKnownRequestError("Record not found", {
        code: "P2025",
        clientVersion: "6.5.0",
      })
    );

    await expect(
      driversServices.updateDriver({ id: driverId }, { name: "New Name" })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Driver to update does not exist.",
    });
  });
});

describe("driversServices.updateDriverStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the status when no active shipments block it", async () => {
    vi.mocked(prisma.driver.update).mockResolvedValue({
      ...basePrismaDriver,
      status: "ACTIVE",
    });

    const result = await driversServices.updateDriverStatus({ id: driverId }, { status: "ACTIVE" });

    expect(result.status).toBe("ACTIVE");
  });

  it("throws a 404 ServerErrors when marking INACTIVE and driver is not found", async () => {
    vi.mocked(prisma.driver.findUnique).mockResolvedValue(null);

    await expect(
      driversServices.updateDriverStatus({ id: driverId }, { status: "INACTIVE" })
    ).rejects.toMatchObject({ statusCode: 404, message: "Driver not found" });
  });

  it("throws a 400 ServerErrors when marking INACTIVE with active shipments", async () => {
    vi.mocked(prisma.driver.findUnique).mockResolvedValue({
      ...basePrismaDriver,
      shipments: [{ id: "s1", status: "IN_TRANSIT" }],
    } as any);

    await expect(
      driversServices.updateDriverStatus({ id: driverId }, { status: "INACTIVE" })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Cannot mark driver as inactive: active shipments exist",
    });
    expect(prisma.driver.update).not.toHaveBeenCalled();
  });

  it("marks the driver INACTIVE when there are no active shipments", async () => {
    vi.mocked(prisma.driver.findUnique).mockResolvedValue({
      ...basePrismaDriver,
      shipments: [],
    } as any);
    vi.mocked(prisma.driver.update).mockResolvedValue({
      ...basePrismaDriver,
      status: "INACTIVE",
    });

    const result = await driversServices.updateDriverStatus(
      { id: driverId },
      { status: "INACTIVE" }
    );

    expect(result.status).toBe("INACTIVE");
  });
});

describe("driversServices.getDriverAssignments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated shipment assignments for a driver", async () => {
    vi.mocked(prisma.shipment.count).mockResolvedValue(2);
    vi.mocked(prisma.shipment.findMany).mockResolvedValue([basePrismaShipment]);

    const result = await driversServices.getDriverAssignments(driverId, 1, 10);

    expect(prisma.shipment.count).toHaveBeenCalledWith({ where: { driverId } });
    expect(result.total).toBe(2);
    expect(result.assignments).toHaveLength(1);
  });

  it("wraps failures as a 500 ServerErrors", async () => {
    vi.mocked(prisma.shipment.count).mockRejectedValue(new Error("db down"));

    await expect(driversServices.getDriverAssignments(driverId)).rejects.toMatchObject({
      statusCode: 500,
      message: "Failed to fetch driver assignments",
    });
  });
});

describe("driversServices.getDriverWithRelations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the driver with nested shipments mapped", async () => {
    vi.mocked(prisma.driver.findUnique).mockResolvedValue({
      ...basePrismaDriver,
      shipments: [],
    } as any);

    const result = await driversServices.getDriverWithRelations({ id: driverId });

    expect(result?.shipments).toEqual([]);
  });

  it("returns null when the driver is not found", async () => {
    vi.mocked(prisma.driver.findUnique).mockResolvedValue(null);

    const result = await driversServices.getDriverWithRelations({ id: driverId });

    expect(result).toBeNull();
  });

  it("throws a 400 ServerErrors for an invalid ID", async () => {
    await expect(
      driversServices.getDriverWithRelations({ id: "not-a-uuid" } as any)
    ).rejects.toMatchObject({ statusCode: 400, message: "Invalid driver ID" });
  });
});
