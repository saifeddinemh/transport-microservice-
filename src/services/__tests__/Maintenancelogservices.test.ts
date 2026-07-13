import { describe, expect, it, vi, beforeEach } from "vitest";
import { maintenanceLogServices } from "../maintenanceLogServices";
import prisma from "../../utils/prisma";

vi.mock("../../utils/prisma", () => ({
  default: {
    vehicle: {
      findUnique: vi.fn(),
    },
    maintenanceLog: {
      create: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const vehicleId = "22222222-2222-2222-2222-222222222222";
const logId = "11111111-1111-1111-1111-111111111111";

const basePrismaLog = {
  id: logId,
  maintenanceType: "Oil change",
  cost: 150,
  notes: null,
  date: new Date("2024-03-01T00:00:00Z"),
  vehicleId,
  createdAt: new Date("2024-03-01T10:00:00Z"),
  updatedAt: new Date("2024-03-01T10:00:00Z"),
};

const validCreateInput = {
  maintenanceType: "Oil change",
  cost: 150,
  date: "2024-03-01",
  vehicleId,
};

describe("maintenanceLogServices.createMaintenanceLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a log when the vehicle exists", async () => {
    (prisma.vehicle.findUnique as any).mockResolvedValue({ id: vehicleId });
    (prisma.maintenanceLog.create as any).mockResolvedValue(basePrismaLog);

    const result = await maintenanceLogServices.createMaintenanceLog(validCreateInput as any);

    expect(prisma.maintenanceLog.create).toHaveBeenCalled();
    expect(result.id).toBe(logId);
  });

  it("throws a 400 ServerErrors when the vehicle does not exist", async () => {
    (prisma.vehicle.findUnique as any).mockResolvedValue(null);

    await expect(
      maintenanceLogServices.createMaintenanceLog(validCreateInput as any)
    ).rejects.toMatchObject({ statusCode: 400, message: "Invalid vehicle identifier" });
    expect(prisma.maintenanceLog.create).not.toHaveBeenCalled();
  });

  it("throws a 400 ServerErrors when validation fails", async () => {
    await expect(
      maintenanceLogServices.createMaintenanceLog({ cost: -1 } as any)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("wraps unexpected errors as a 500 ServerErrors", async () => {
    (prisma.vehicle.findUnique as any).mockRejectedValue(new Error("db down"));

    await expect(
      maintenanceLogServices.createMaintenanceLog(validCreateInput as any)
    ).rejects.toMatchObject({ statusCode: 500 });
  });
});

describe("maintenanceLogServices.getMaintenanceLogById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the mapped log when found", async () => {
    (prisma.maintenanceLog.findUnique as any).mockResolvedValue(basePrismaLog);

    const result = await maintenanceLogServices.getMaintenanceLogById({ id: logId });

    expect(result?.id).toBe(logId);
  });

  it("returns null when not found", async () => {
    (prisma.maintenanceLog.findUnique as any).mockResolvedValue(null);

    const result = await maintenanceLogServices.getMaintenanceLogById({ id: logId });

    expect(result).toBeNull();
  });

  it("throws a 400 ServerErrors for an invalid ID", async () => {
    await expect(
      maintenanceLogServices.getMaintenanceLogById({ id: "not-a-uuid" } as any)
    ).rejects.toMatchObject({ statusCode: 400, message: "Invalid maintenance log ID" });
  });
});

describe("maintenanceLogServices.getMaintenanceLogsByVehicle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated logs for a vehicle", async () => {
    (prisma.maintenanceLog.count as any).mockResolvedValue(1);
    (prisma.maintenanceLog.findMany as any).mockResolvedValue([basePrismaLog]);

    const result = await maintenanceLogServices.getMaintenanceLogsByVehicle({
      vehicleId,
    } as any);

    expect(result.total).toBe(1);
    expect(result.data).toHaveLength(1);
  });

  it("wraps failures as a 500 ServerErrors", async () => {
    (prisma.maintenanceLog.count as any).mockRejectedValue(new Error("db down"));

    await expect(
      maintenanceLogServices.getMaintenanceLogsByVehicle({ vehicleId } as any)
    ).rejects.toMatchObject({
      statusCode: 500,
      message: "Failed to fetch maintenance logs",
    });
  });
});

describe("maintenanceLogServices.getMaintenanceStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("computes total, average cost, and count", async () => {
    (prisma.maintenanceLog.findMany as any).mockResolvedValue([
      { ...basePrismaLog, cost: 100 },
      { ...basePrismaLog, cost: 200 },
    ]);

    const result = await maintenanceLogServices.getMaintenanceStats({
      vehicleId,
    } as any);

    expect(result).toEqual({ totalCost: 300, averageCost: 150, count: 2 });
  });

  it("returns zeroed stats when there are no logs", async () => {
    (prisma.maintenanceLog.findMany as any).mockResolvedValue([]);

    const result = await maintenanceLogServices.getMaintenanceStats({} as any);

    expect(result).toEqual({ totalCost: 0, averageCost: 0, count: 0 });
  });

  it("throws a 400 ServerErrors for an invalid yearMonth", async () => {
    await expect(
      maintenanceLogServices.getMaintenanceStats({ yearMonth: "invalid" } as any)
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("maintenanceLogServices.updateMaintenanceLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates an existing log", async () => {
    (prisma.maintenanceLog.findUnique as any).mockResolvedValue(basePrismaLog);
    (prisma.maintenanceLog.update as any).mockResolvedValue({
      ...basePrismaLog,
      cost: 300,
    });

    const result = await maintenanceLogServices.updateMaintenanceLog({ id: logId }, {
      cost: 300,
    } as any);

    expect(result.cost).toBe(300);
  });

  it("throws a 404 ServerErrors when the log does not exist", async () => {
    (prisma.maintenanceLog.findUnique as any).mockResolvedValue(null);

    await expect(
      maintenanceLogServices.updateMaintenanceLog({ id: logId }, { cost: 300 } as any)
    ).rejects.toMatchObject({ statusCode: 404, message: "Maintenance log not found" });
  });

  it("throws a 400 ServerErrors when validation fails", async () => {
    await expect(
      maintenanceLogServices.updateMaintenanceLog({ id: logId }, { cost: -5 } as any)
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
