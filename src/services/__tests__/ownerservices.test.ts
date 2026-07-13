import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import { ownerServices } from "../ownerServices";
import prisma from "../../utils/prisma";
import { hashPassword, verifyPassword } from "../../utils/hash";
import { ServerErrors } from "../../utils/serverErrors";

vi.mock("../../utils/prisma", () => ({
  default: {
    owner: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../../utils/hash", () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

const basePrismaOwner = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "owner@agrofield.com",
  password: "hashed-password",
  salt: "salt-value",
  firstName: "Amine",
  lastName: "Benali",
  telephone: "0612345678",
  birthDate: new Date("1990-01-01"),
  identityType: null,
  identityNumber: null,
  address: null,
  country: null,
  city: null,
  postcode: null,
  createdAt: new Date("2024-01-01T10:00:00Z"),
  updatedAt: new Date("2024-01-02T10:00:00Z"),
};

const validInput = {
  email: "owner@agrofield.com",
  password: "SuperSecret123",
  firstName: "Amine",
  lastName: "Benali",
  telephone: "0612345678",
  birthDate: new Date("1990-01-01"),
};

describe("ownerServices.registerOwner", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(hashPassword).mockResolvedValue({
      hashedPassword: "hashed-password",
      salt: "salt-value",
    });
  });

  it("creates a new owner and returns the mapped model", async () => {
    vi.mocked(prisma.owner.create).mockResolvedValue(basePrismaOwner);

    const result = await ownerServices.registerOwner(validInput);

    expect(hashPassword).toHaveBeenCalledWith("SuperSecret123");

    expect(prisma.owner.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: validInput.email,
        password: "hashed-password",
        salt: "salt-value",
      }),
    });

    expect(result.id).toBe(basePrismaOwner.id);
  });

  it("throws a 409 ServerErrors when the email already exists", async () => {
    vi.mocked(prisma.owner.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "6.5.0",
      })
    );

    await expect(ownerServices.registerOwner(validInput)).rejects.toMatchObject({
      statusCode: 409,
      message: "An owner is already registered with the given email.",
    });
  });

  it("throws a 400 ServerErrors when validation fails", async () => {
    await expect(
      ownerServices.registerOwner({
        email: "not-an-email",
      } as any)
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("wraps unexpected errors as a 500 ServerErrors", async () => {
    vi.mocked(hashPassword).mockRejectedValue(new Error("boom"));

    await expect(ownerServices.registerOwner(validInput)).rejects.toBeInstanceOf(ServerErrors);

    await expect(ownerServices.registerOwner(validInput)).rejects.toMatchObject({
      statusCode: 500,
    });
  });
});

describe("ownerServices.loginOwner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const credentials = {
    email: "owner@agrofield.com",
    password: "SuperSecret123",
  };

  it("returns the mapped owner when credentials are valid", async () => {
    vi.mocked(prisma.owner.findUnique).mockResolvedValue(basePrismaOwner);
    vi.mocked(verifyPassword).mockResolvedValue(true);

    const result = await ownerServices.loginOwner(credentials);

    expect(prisma.owner.findUnique).toHaveBeenCalledWith({
      where: {
        email: credentials.email,
      },
    });

    expect(verifyPassword).toHaveBeenCalledWith(
      credentials.password,
      basePrismaOwner.password,
      basePrismaOwner.salt
    );

    expect(result.email).toBe(basePrismaOwner.email);
  });

  it("throws a 401 ServerErrors when the owner does not exist", async () => {
    vi.mocked(prisma.owner.findUnique).mockResolvedValue(null);

    await expect(ownerServices.loginOwner(credentials)).rejects.toMatchObject({
      statusCode: 401,
      message: "Invalid email or password",
    });
  });

  it("throws a 401 ServerErrors when the password is incorrect", async () => {
    vi.mocked(prisma.owner.findUnique).mockResolvedValue(basePrismaOwner);
    vi.mocked(verifyPassword).mockResolvedValue(false);

    await expect(ownerServices.loginOwner(credentials)).rejects.toMatchObject({
      statusCode: 401,
      message: "Invalid email or password",
    });
  });

  it("throws a 400 ServerErrors when validation fails", async () => {
    await expect(
      ownerServices.loginOwner({
        email: "not-an-email",
      } as any)
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
