import { describe, expect, it, vi, beforeEach } from "vitest";
import { fuelLogsServices } from "../fuelLogServices";
import prisma from "../../utils/prisma";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

vi.mock("../../utils/prisma", () => ({
  default: {
    vehicle: {
      findUnique: vi.fn(),
    },
    fuelLog: {
      findFirst: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const vehicleId = "22222222-2222-2222-2222-222222222222";
const farmId = "33333333-3333-3333-3333-333333333333";
const logId = "11111111-1111-1111-1111-111111111111";

const basePrismaFuelLog = {
  id: logId,
  fuelType: "DIESEL",
  quantity: 50,
  cost: 500,
  filledBy: "Karim",
  date: new Date("2024-03-01T00:00:00Z"),
  odometerReading: 1000,
  vehicleId,
  createdAt: new Date("2024-03-01T10:00:00Z"),
  updatedAt: new Date("2024-03-01T10:00:00Z"),
  vehicle: {
    id: vehicleId,
    farmId,
    plateNumber: "12345-A-6",
    type: "TRUCK",
    status: "ACTIVE",
    capacity: 1000,
    fuelLevel: 80,
    fuelType: "DIESEL",
    lastMaintenance: null,
    isArchived: false,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  },
};

const validCreateInput = {
  fuelType: "DIESEL" as const,
  quantity: 50,
  cost: 500,
  filledBy: "Karim",
  date: "2024-03-01",
  odometerReading: 1000,
  vehicleId,
};

describe("fuelLogsServices.createFuelLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a fuel log when the vehicle exists and odometer is monotonic", async () => {
    (prisma.vehicle.findUnique as any).mockResolvedValue({ id: vehicleId, farmId });
    (prisma.fuelLog.findFirst as any).mockResolvedValue(null);
    (prisma.fuelLog.create as any).mockResolvedValue(basePrismaFuelLog);

    const result = await fuelLogsServices.createFuelLog(validCreateInput as any);

    expect(prisma.fuelLog.create).toHaveBeenCalled();
    expect(result.id).toBe(logId);
  });

  it("throws a 404 ServerErrors when the vehicle does not exist", async () => {
    (prisma.vehicle.findUnique as any).mockResolvedValue(null);

    await expect(fuelLogsServices.createFuelLog(validCreateInput as any)).rejects.toMatchObject({
      statusCode: 404,
      message: "Vehicle not found",
    });
    expect(prisma.fuelLog.create).not.toHaveBeenCalled();
  });

  it("throws a 400 ServerErrors when the odometer reading regresses", async () => {
    (prisma.vehicle.findUnique as any).mockResolvedValue({ id: vehicleId, farmId });
    (prisma.fuelLog.findFirst as any).mockResolvedValue({
      ...basePrismaFuelLog,
      odometerReading: 2000,
    });

    await expect(fuelLogsServices.createFuelLog(validCreateInput as any)).rejects.toMatchObject({
      statusCode: 400,
      message: "Odometer reading cannot be less than previous reading",
    });
    expect(prisma.fuelLog.create).not.toHaveBeenCalled();
  });

  it("throws a 400 ServerErrors when validation fails", async () => {
    await expect(fuelLogsServices.createFuelLog({ quantity: -1 } as any)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("maps a Prisma P2003 error to a 404 ServerErrors", async () => {
    (prisma.vehicle.findUnique as any).mockResolvedValue({ id: vehicleId, farmId });
    (prisma.fuelLog.findFirst as any).mockResolvedValue(null);
    (prisma.fuelLog.create as any).mockRejectedValue(
      new PrismaClientKnownRequestError("Foreign key constraint failed", {
        code: "P2003",
        clientVersion: "6.5.0",
      })
    );

    await expect(fuelLogsServices.createFuelLog(validCreateInput as any)).rejects.toMatchObject({
      statusCode: 404,
      message: "Vehicle not found",
    });
  });
});

describe("fuelLogsServices.getFuelLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated fuel logs", async () => {
    (prisma.fuelLog.count as any).mockResolvedValue(1);
    (prisma.fuelLog.findMany as any).mockResolvedValue([basePrismaFuelLog]);

    const result = await fuelLogsServices.getFuelLogs({ farmId } as any);

    expect(result.total).toBe(1);
    expect(result.fuelLogs).toHaveLength(1);
  });

  it("wraps failures as a 500 ServerErrors", async () => {
    (prisma.fuelLog.count as any).mockRejectedValue(new Error("db down"));

    await expect(fuelLogsServices.getFuelLogs({ farmId } as any)).rejects.toMatchObject({
      statusCode: 500,
      message: "Failed to fetch fuel logs",
    });
  });
});

describe("fuelLogsServices.getVehicleFuelHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated fuel logs for a vehicle", async () => {
    (prisma.fuelLog.count as any).mockResolvedValue(1);
    (prisma.fuelLog.findMany as any).mockResolvedValue([basePrismaFuelLog]);

    const result = await fuelLogsServices.getVehicleFuelHistory(vehicleId, {} as any);

    expect(result.total).toBe(1);
  });

  it("wraps failures as a 500 ServerErrors", async () => {
    (prisma.fuelLog.count as any).mockRejectedValue(new Error("db down"));

    await expect(
      fuelLogsServices.getVehicleFuelHistory(vehicleId, {} as any)
    ).rejects.toMatchObject({
      statusCode: 500,
      message: "Failed to fetch vehicle fuel history",
    });
  });
});

describe("fuelLogsServices.updateFuelLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates a fuel log without odometer changes", async () => {
    (prisma.fuelLog.update as any).mockResolvedValue({
      ...basePrismaFuelLog,
      filledBy: "Sara",
    });

    const result = await fuelLogsServices.updateFuelLog({ id: logId }, { filledBy: "Sara" } as any);

    expect(result.filledBy).toBe("Sara");
    expect(prisma.fuelLog.findUnique).not.toHaveBeenCalled();
  });

  it("throws a 404 ServerErrors when updating odometer on a missing log", async () => {
    (prisma.fuelLog.findUnique as any).mockResolvedValue(null);

    await expect(
      fuelLogsServices.updateFuelLog({ id: logId }, { odometerReading: 1500 } as any)
    ).rejects.toMatchObject({ statusCode: 404, message: "Fuel log not found" });
  });

  it("throws a 400 ServerErrors when the new odometer reading regresses before the previous log", async () => {
    (prisma.fuelLog.findUnique as any).mockResolvedValue(basePrismaFuelLog);
    (prisma.fuelLog.findFirst as any)
      .mockResolvedValueOnce({ ...basePrismaFuelLog, odometerReading: 1200 }) // previous log
      .mockResolvedValueOnce(null); // next log

    await expect(
      fuelLogsServices.updateFuelLog({ id: logId }, { odometerReading: 1100 } as any)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Odometer reading cannot be less than previous reading",
    });
  });

  it("throws a 400 ServerErrors when the new odometer reading exceeds the next log", async () => {
    (prisma.fuelLog.findUnique as any).mockResolvedValue(basePrismaFuelLog);
    (prisma.fuelLog.findFirst as any)
      .mockResolvedValueOnce(null) // previous log
      .mockResolvedValueOnce({ ...basePrismaFuelLog, odometerReading: 1300 }); // next log

    await expect(
      fuelLogsServices.updateFuelLog({ id: logId }, { odometerReading: 1400 } as any)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Odometer reading cannot be greater than next reading",
    });
  });

  it("maps a Prisma P2025 error to a 404 ServerErrors", async () => {
    (prisma.fuelLog.update as any).mockRejectedValue(
      new PrismaClientKnownRequestError("Record not found", {
        code: "P2025",
        clientVersion: "6.5.0",
      })
    );

    await expect(
      fuelLogsServices.updateFuelLog({ id: logId }, { filledBy: "Sara" } as any)
    ).rejects.toMatchObject({ statusCode: 404, message: "Fuel log not found" });
  });
});

describe("fuelLogsServices.getConsumptionStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zeroed stats when there are no logs", async () => {
    (prisma.fuelLog.findMany as any).mockResolvedValue([]);

    const result = await fuelLogsServices.getConsumptionStats({
      farmId,
      period: "monthly",
    } as any);

    expect(result).toMatchObject({
      totalLiters: 0,
      totalCost: 0,
      averageCostPerLiter: 0,
      averageConsumption: null,
      totalDistance: null,
      vehicleCount: 0,
    });
  });

  it("computes aggregated consumption stats across logs", async () => {
    (prisma.fuelLog.findMany as any).mockResolvedValue([
      { ...basePrismaFuelLog, quantity: 20, cost: 200, odometerReading: 1000 },
      { ...basePrismaFuelLog, quantity: 30, cost: 300, odometerReading: 1500 },
    ]);

    const result = await fuelLogsServices.getConsumptionStats({
      farmId,
      period: "monthly",
    } as any);

    expect(result.totalLiters).toBe(50);
    expect(result.totalCost).toBe(500);
    expect(result.vehicleCount).toBe(1);
    expect(result.totalDistance).toBe(500);
  });

  it("wraps failures as a 500 ServerErrors", async () => {
    (prisma.fuelLog.findMany as any).mockRejectedValue(new Error("db down"));

    await expect(
      fuelLogsServices.getConsumptionStats({ farmId, period: "monthly" } as any)
    ).rejects.toMatchObject({
      statusCode: 500,
      message: "Failed to generate consumption stats",
    });
  });
});

describe("fuelLogsServices.getCostStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zeroed stats when there are no logs", async () => {
    (prisma.fuelLog.findMany as any).mockResolvedValue([]);

    const result = await fuelLogsServices.getCostStats({
      farmId,
      groupBy: "month",
    } as any);

    expect(result).toEqual({
      period: "month",
      totalCost: 0,
      averageCostPerLiter: 0,
      vehicleCount: 0,
      fuelTypeBreakdown: [],
    });
  });

  it("computes a fuel-type cost breakdown", async () => {
    (prisma.fuelLog.findMany as any).mockResolvedValue([
      { ...basePrismaFuelLog, fuelType: "DIESEL", quantity: 20, cost: 200 },
      { ...basePrismaFuelLog, fuelType: "GASOLINE", quantity: 10, cost: 150 },
    ]);

    const result = await fuelLogsServices.getCostStats({
      farmId,
      groupBy: "month",
    } as any);

    expect(result.totalCost).toBe(350);
    expect(result.vehicleCount).toBe(1);
    expect(result.fuelTypeBreakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fuelType: "DIESEL", totalCost: 200 }),
        expect.objectContaining({ fuelType: "GASOLINE", totalCost: 150 }),
      ])
    );
  });

  it("wraps failures as a 500 ServerErrors", async () => {
    (prisma.fuelLog.findMany as any).mockRejectedValue(new Error("db down"));

    await expect(
      fuelLogsServices.getCostStats({ farmId, groupBy: "month" } as any)
    ).rejects.toMatchObject({
      statusCode: 500,
      message: "Failed to generate cost stats",
    });
  });
});

describe("fuelLogsServices.getFuelLogById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the mapped fuel log when found", async () => {
    (prisma.fuelLog.findUnique as any).mockResolvedValue(basePrismaFuelLog);

    const result = await fuelLogsServices.getFuelLogById(logId);

    expect(result?.id).toBe(logId);
  });

  it("returns null when not found", async () => {
    (prisma.fuelLog.findUnique as any).mockResolvedValue(null);

    const result = await fuelLogsServices.getFuelLogById(logId);

    expect(result).toBeNull();
  });

  it("wraps failures as a 500 ServerErrors", async () => {
    (prisma.fuelLog.findUnique as any).mockRejectedValue(new Error("db down"));

    await expect(fuelLogsServices.getFuelLogById(logId)).rejects.toMatchObject({
      statusCode: 500,
      message: "Failed to fetch fuel log",
    });
  });
});
