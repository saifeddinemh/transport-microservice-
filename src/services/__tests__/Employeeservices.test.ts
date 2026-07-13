import { describe, expect, it, vi, beforeEach } from "vitest";
import { employeeServices } from "../employeeServices";
import prisma from "../../utils/prisma";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { ServerErrors } from "../../utils/serverErrors";

vi.mock("../../utils/prisma", () => ({
  default: {
    farm: {
      findUnique: vi.fn(),
    },
    employee: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

const farmId = "22222222-2222-2222-2222-222222222222";

const basePrismaEmployee = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "employee@agrofield.com",
  firstName: "Sara",
  lastName: "Idrissi",
  telephone: "0611111111",
  role: "MANAGER" as const,
  transport: 0,
  farmId,
  status: "ACTIVE" as const,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-02"),
};

const validCreateInput = {
  email: "employee@agrofield.com",
  firstName: "Sara",
  lastName: "Idrissi",
  telephone: "0611111111",
  role: "MANAGER" as const,
  transport: 0,
  farmId,
  status: "ACTIVE" as const,
};

describe("employeeServices.createEmployee", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an employee when farm exists", async () => {
    vi.mocked(prisma.farm.findUnique).mockResolvedValue({ id: farmId } as any);

    vi.mocked(prisma.employee.create).mockResolvedValue(basePrismaEmployee);

    const result = await employeeServices.createEmployee(validCreateInput);

    expect(prisma.employee.create).toHaveBeenCalledWith({
      data: validCreateInput,
    });

    expect(result.id).toBe(basePrismaEmployee.id);
  });

  it("throws 404 when farm does not exist", async () => {
    vi.mocked(prisma.farm.findUnique).mockResolvedValue(null);

    await expect(employeeServices.createEmployee(validCreateInput)).rejects.toMatchObject({
      statusCode: 404,
      message: "Farm not found",
    });

    expect(prisma.employee.create).not.toHaveBeenCalled();
  });

  it("throws 409 when employee already exists", async () => {
    vi.mocked(prisma.farm.findUnique).mockResolvedValue({
      id: farmId,
    } as any);

    vi.mocked(prisma.employee.create).mockRejectedValue(
      new PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "6.5.0",
      })
    );

    await expect(employeeServices.createEmployee(validCreateInput)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it("throws 400 when validation fails", async () => {
    await expect(
      employeeServices.createEmployee({
        firstName: "A",
      } as any)
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("throws 500 on unexpected error", async () => {
    vi.mocked(prisma.farm.findUnique).mockRejectedValue(new Error("Database down"));

    await expect(employeeServices.createEmployee(validCreateInput)).rejects.toBeInstanceOf(
      ServerErrors
    );
  });
});

describe("employeeServices.getFarmEmployees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns employees with pagination", async () => {
    vi.mocked(prisma.employee.count).mockResolvedValue(1);

    vi.mocked(prisma.employee.findMany).mockResolvedValue([basePrismaEmployee]);

    const result = await employeeServices.getFarmEmployees({
      farmId,
      page: 1,
      limit: 10,
    });

    expect(result?.total).toBe(1);

    expect(result?.employees[0].id).toBe(basePrismaEmployee.id);
  });

  it("throws 400 when farmId missing", async () => {
    await expect(
      employeeServices.getFarmEmployees({
        page: 1,
        limit: 10,
      } as any)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Farm ID is required",
    });
  });

  it("throws 500 on database failure", async () => {
    vi.mocked(prisma.employee.count).mockRejectedValue(new Error("db down"));

    await expect(
      employeeServices.getFarmEmployees({
        farmId,
        page: 1,
        limit: 10,
      })
    ).rejects.toMatchObject({
      statusCode: 500,
      message: "Failed to fetch employees",
    });
  });
});
