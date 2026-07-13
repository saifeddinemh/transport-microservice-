import { describe, expect, it, vi, beforeEach } from "vitest";
import { contractServices } from "../transportationContractServices";
import prisma from "../../utils/prisma";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

vi.mock("../../utils/prisma", () => ({
  default: {
    transport: {
      findUnique: vi.fn(),
    },
    transportationContract: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const transportId = "22222222-2222-2222-2222-222222222222";
const contractId = "11111111-1111-1111-1111-111111111111";

const basePrismaContract = {
  id: contractId,
  startDate: new Date("2024-01-01T00:00:00Z"),
  endDate: new Date("2024-12-31T00:00:00Z"),
  contractType: "PERMANENT",
  pricePerKm: 2.5,
  maxWeight: 5000,
  status: "ACTIVE",
  serviceType: null,
  terms: null,
  isArchived: false,
  transportId,
  createdAt: new Date("2024-01-01T10:00:00Z"),
  updatedAt: new Date("2024-01-02T10:00:00Z"),
};

const validCreateInput = {
  startDate: "2024-01-01",
  endDate: "2024-12-31",
  contractType: "PERMANENT" as const,
  pricePerKm: 2.5,
  maxWeight: 5000,
  transportId,
};

describe("contractServices.createContract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a contract when there is no overlap and the transporter exists", async () => {
    (prisma.transportationContract.findMany as any).mockResolvedValue([]);
    (prisma.transport.findUnique as any).mockResolvedValue({ id: transportId });
    (prisma.transportationContract.create as any).mockResolvedValue(basePrismaContract);

    const result = await contractServices.createContract(validCreateInput as any);

    expect(prisma.transportationContract.create).toHaveBeenCalled();
    expect(result.id).toBe(contractId);
  });

  it("throws a 409 ServerErrors when the date range overlaps an existing contract", async () => {
    (prisma.transportationContract.findMany as any).mockResolvedValue([basePrismaContract]);

    await expect(contractServices.createContract(validCreateInput as any)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(prisma.transportationContract.create).not.toHaveBeenCalled();
  });

  it("throws a 404 ServerErrors when the transporter does not exist", async () => {
    (prisma.transportationContract.findMany as any).mockResolvedValue([]);
    (prisma.transport.findUnique as any).mockResolvedValue(null);

    await expect(contractServices.createContract(validCreateInput as any)).rejects.toMatchObject({
      statusCode: 404,
      message: "Transport provider not found",
    });
    expect(prisma.transportationContract.create).not.toHaveBeenCalled();
  });

  it("throws a 409 ServerErrors on a Prisma unique constraint violation", async () => {
    (prisma.transportationContract.findMany as any).mockResolvedValue([]);
    (prisma.transport.findUnique as any).mockResolvedValue({ id: transportId });
    (prisma.transportationContract.create as any).mockRejectedValue(
      new PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "6.5.0",
      })
    );

    await expect(contractServices.createContract(validCreateInput as any)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it("throws a 400 ServerErrors when validation fails", async () => {
    await expect(contractServices.createContract({ pricePerKm: -1 } as any)).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

describe("contractServices.getContractById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the mapped contract when found", async () => {
    (prisma.transportationContract.findFirst as any).mockResolvedValue(basePrismaContract);

    const result = await contractServices.getContractById({ id: contractId });

    expect(result?.id).toBe(contractId);
  });

  it("returns null when not found", async () => {
    (prisma.transportationContract.findFirst as any).mockResolvedValue(null);

    const result = await contractServices.getContractById({ id: contractId });

    expect(result).toBeNull();
  });

  it("throws a 400 ServerErrors for an invalid ID", async () => {
    await expect(
      contractServices.getContractById({ id: "not-a-uuid" } as any)
    ).rejects.toMatchObject({ statusCode: 400, message: "Invalid contract ID" });
  });
});

describe("contractServices.getAllContracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated non-archived contracts", async () => {
    (prisma.transportationContract.count as any).mockResolvedValue(1);
    (prisma.transportationContract.findMany as any).mockResolvedValue([basePrismaContract]);

    const result = await contractServices.getAllContracts({} as any);

    expect(prisma.transportationContract.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isArchived: false }) })
    );
    expect(result.total).toBe(1);
  });

  it("wraps failures as a 500 ServerErrors", async () => {
    (prisma.transportationContract.count as any).mockRejectedValue(new Error("db down"));

    await expect(contractServices.getAllContracts({} as any)).rejects.toMatchObject({
      statusCode: 500,
      message: "Failed to fetch contracts",
    });
  });
});

describe("contractServices.updateContract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates a contract without re-checking overlap when dates/transport are unchanged", async () => {
    (prisma.transportationContract.findFirst as any).mockResolvedValue(basePrismaContract);
    (prisma.transportationContract.update as any).mockResolvedValue({
      ...basePrismaContract,
      pricePerKm: 3,
    });

    const result = await contractServices.updateContract({ id: contractId }, {
      pricePerKm: 3,
    } as any);

    expect(prisma.transportationContract.findMany).not.toHaveBeenCalled();
    expect(result.pricePerKm).toBe(3);
  });

  it("throws a 404 ServerErrors when the contract does not exist", async () => {
    (prisma.transportationContract.findFirst as any).mockResolvedValue(null);

    await expect(
      contractServices.updateContract({ id: contractId }, { pricePerKm: 3 } as any)
    ).rejects.toMatchObject({ statusCode: 404, message: "Contract not found" });
  });

  it("re-checks overlap and throws a 409 ServerErrors when the new dates overlap", async () => {
    (prisma.transportationContract.findFirst as any).mockResolvedValue(basePrismaContract);
    (prisma.transportationContract.findMany as any).mockResolvedValue([
      { ...basePrismaContract, id: "other-contract" },
    ]);

    await expect(
      contractServices.updateContract({ id: contractId }, { startDate: "2024-06-01" } as any)
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(prisma.transportationContract.update).not.toHaveBeenCalled();
  });
});

describe("contractServices.archiveContract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("archives an active contract", async () => {
    (prisma.transportationContract.findFirst as any).mockResolvedValue(basePrismaContract);
    (prisma.transportationContract.update as any).mockResolvedValue({
      ...basePrismaContract,
      isArchived: true,
      status: "INACTIVE",
    });

    const result = await contractServices.archiveContract({ id: contractId });

    expect(prisma.transportationContract.update).toHaveBeenCalledWith({
      where: { id: contractId },
      data: { isArchived: true, status: "INACTIVE" },
    });
    expect(result.isArchived).toBe(true);
  });

  it("throws a 404 ServerErrors when the contract does not exist or is already archived", async () => {
    (prisma.transportationContract.findFirst as any).mockResolvedValue(null);

    await expect(contractServices.archiveContract({ id: contractId })).rejects.toMatchObject({
      statusCode: 404,
      message: "Contract not found or already archived",
    });
  });

  it("throws a 400 ServerErrors for an invalid ID", async () => {
    await expect(
      contractServices.archiveContract({ id: "not-a-uuid" } as any)
    ).rejects.toMatchObject({ statusCode: 400, message: "Invalid contract ID" });
  });
});

describe("contractServices.checkOverlap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves silently when there is no overlapping contract", async () => {
    (prisma.transportationContract.findMany as any).mockResolvedValue([]);

    await expect(
      contractServices.checkOverlap(transportId, new Date("2024-01-01"))
    ).resolves.toBeUndefined();
  });

  it("throws a 409 ServerErrors when an overlapping contract exists", async () => {
    (prisma.transportationContract.findMany as any).mockResolvedValue([basePrismaContract]);

    await expect(
      contractServices.checkOverlap(transportId, new Date("2024-01-01"))
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("wraps unexpected DB errors as a 500 ServerErrors", async () => {
    (prisma.transportationContract.findMany as any).mockRejectedValue(new Error("db down"));

    await expect(
      contractServices.checkOverlap(transportId, new Date("2024-01-01"))
    ).rejects.toMatchObject({ statusCode: 500, message: "Error checking contract overlap" });
  });
});
