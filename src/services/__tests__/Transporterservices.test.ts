import { describe, expect, it, vi, beforeEach } from "vitest";
import { transporterServices } from "../transporterServices";
import prisma from "../../utils/prisma";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

vi.mock("../../utils/prisma", () => ({
  default: {
    transport: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const farmId = "22222222-2222-2222-2222-222222222222";
const transporterId = "11111111-1111-1111-1111-111111111111";

const basePrismaTransporter = {
  id: transporterId,
  name: "Atlas Logistics",
  email: "contact@atlaslogistics.com",
  phoneNumber: "0522334455",
  address: "Zone Industrielle, Casablanca",
  status: "ACTIVE",
  isArchived: false,
  farmId,
  createdAt: new Date("2024-01-01T10:00:00Z"),
  updatedAt: new Date("2024-01-02T10:00:00Z"),
};

const validCreateInput = {
  name: "Atlas Logistics",
  email: "contact@atlaslogistics.com",
  phoneNumber: "0522334455",
  address: "Zone Industrielle, Casablanca",
  farmId,
};

describe("transporterServices.createTransporter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a transporter and returns the mapped model", async () => {
    (prisma.transport.create as any).mockResolvedValue(basePrismaTransporter);

    const result = await transporterServices.createTransporter(validCreateInput as any);

    expect(prisma.transport.create).toHaveBeenCalled();
    expect(result.id).toBe(transporterId);
  });

  it("throws a 409 ServerErrors on a duplicate email (P2002)", async () => {
    (prisma.transport.create as any).mockRejectedValue(
      new PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "6.5.0",
      })
    );

    await expect(
      transporterServices.createTransporter(validCreateInput as any)
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("throws a 400 ServerErrors for an invalid farm ID (P2003)", async () => {
    (prisma.transport.create as any).mockRejectedValue(
      new PrismaClientKnownRequestError("Foreign key constraint failed", {
        code: "P2003",
        clientVersion: "6.5.0",
      })
    );

    await expect(
      transporterServices.createTransporter(validCreateInput as any)
    ).rejects.toMatchObject({ statusCode: 400, message: "Invalid Farm ID Provided" });
  });

  it("throws a 400 ServerErrors when validation fails", async () => {
    await expect(transporterServices.createTransporter({ name: "A" } as any)).rejects.toMatchObject(
      { statusCode: 400 }
    );
  });
});

describe("transporterServices.getTransporters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated transporters excluding INACTIVE by default", async () => {
    (prisma.transport.count as any).mockResolvedValue(1);
    (prisma.transport.findMany as any).mockResolvedValue([basePrismaTransporter]);

    const result = await transporterServices.getTransporters({} as any);

    expect(prisma.transport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: { not: "INACTIVE" } }),
      })
    );
    expect(result.total).toBe(1);
  });

  it("applies a search term as an OR clause", async () => {
    (prisma.transport.count as any).mockResolvedValue(0);
    (prisma.transport.findMany as any).mockResolvedValue([]);

    await transporterServices.getTransporters({ searchTerm: "atlas" } as any);

    const callArgs = (prisma.transport.findMany as any).mock.calls[0][0];
    expect(callArgs.where.OR).toEqual(
      expect.arrayContaining([{ name: { contains: "atlas", mode: "insensitive" } }])
    );
  });

  it("wraps failures as a 500 ServerErrors", async () => {
    (prisma.transport.count as any).mockRejectedValue(new Error("db down"));

    await expect(transporterServices.getTransporters({} as any)).rejects.toMatchObject({
      statusCode: 500,
      message: "Failed to fetch transporters",
    });
  });
});

describe("transporterServices.getTransporterById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the mapped transporter when found", async () => {
    (prisma.transport.findFirst as any).mockResolvedValue(basePrismaTransporter);

    const result = await transporterServices.getTransporterById({ id: transporterId });

    expect(result?.id).toBe(transporterId);
  });

  it("returns null when not found", async () => {
    (prisma.transport.findFirst as any).mockResolvedValue(null);

    const result = await transporterServices.getTransporterById({ id: transporterId });

    expect(result).toBeNull();
  });

  it("throws a 400 ServerErrors for an invalid ID", async () => {
    await expect(
      transporterServices.getTransporterById({ id: "not-a-uuid" } as any)
    ).rejects.toMatchObject({ statusCode: 400, message: "Invalid transporter ID" });
  });
});

describe("transporterServices.updateTransporter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates an existing transporter", async () => {
    (prisma.transport.findFirst as any).mockResolvedValue(basePrismaTransporter);
    (prisma.transport.update as any).mockResolvedValue({
      ...basePrismaTransporter,
      name: "New Name",
    });

    const result = await transporterServices.updateTransporter({ id: transporterId }, {
      name: "New Name",
    } as any);

    expect(result.name).toBe("New Name");
  });

  it("throws a 404 ServerErrors when the transporter does not exist", async () => {
    (prisma.transport.findFirst as any).mockResolvedValue(null);

    await expect(
      transporterServices.updateTransporter({ id: transporterId }, { name: "New Name" } as any)
    ).rejects.toMatchObject({ statusCode: 404, message: "Transporter not found" });
  });

  it("throws a 409 ServerErrors on a duplicate email (P2002)", async () => {
    (prisma.transport.findFirst as any).mockResolvedValue(basePrismaTransporter);
    (prisma.transport.update as any).mockRejectedValue(
      new PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "6.5.0",
      })
    );

    await expect(
      transporterServices.updateTransporter({ id: transporterId }, {
        email: "taken@agrofield.com",
      } as any)
    ).rejects.toMatchObject({ statusCode: 409, message: "Email already in use" });
  });
});

describe("transporterServices.archiveTransporter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("archives an active transporter", async () => {
    (prisma.transport.findFirst as any).mockResolvedValue(basePrismaTransporter);
    (prisma.transport.update as any).mockResolvedValue({
      ...basePrismaTransporter,
      status: "INACTIVE",
      isArchived: true,
    });

    const result = await transporterServices.archiveTransporter({ id: transporterId });

    expect(prisma.transport.update).toHaveBeenCalledWith({
      where: { id: transporterId },
      data: { status: "INACTIVE", isArchived: true },
    });
    expect(result.status).toBe("INACTIVE");
  });

  it("throws a 404 ServerErrors when the transporter does not exist or is already archived", async () => {
    (prisma.transport.findFirst as any).mockResolvedValue(null);

    await expect(
      transporterServices.archiveTransporter({ id: transporterId })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Transporter not found or already archived",
    });
  });

  it("throws a 400 ServerErrors for an invalid ID", async () => {
    await expect(
      transporterServices.archiveTransporter({ id: "not-a-uuid" } as any)
    ).rejects.toMatchObject({ statusCode: 400, message: "Invalid transporter ID" });
  });
});
