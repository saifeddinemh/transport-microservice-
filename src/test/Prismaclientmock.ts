import { PrismaClient } from "@prisma/client";
import { mockDeep, mockReset } from "vitest-mock-extended";
import { beforeEach } from "vitest";

export const prismaMock = mockDeep<PrismaClient>();

export const resetPrismaMock = (): void => {
  mockReset(prismaMock);
};

beforeEach(() => {
  resetPrismaMock();
});

prismaMock.$transaction.mockImplementation(async (callback: any) => {
  if (typeof callback === "function") {
    return callback(prismaMock);
  }

  if (Array.isArray(callback)) {
    return Promise.all(callback);
  }

  return callback;
});

export const createMockOwner = (overrides = {}) => ({
  id: "owner-1",
  email: "owner@agrofield.com",
  firstName: "Jane",
  lastName: "Doe",
  telephone: "0600000000",
  birthDate: new Date("1990-01-01"),
  identityType: null,
  identityNumber: null,
  address: null,
  country: null,
  city: null,
  postcode: null,
  password: "hashed:SuperSecret123",
  salt: "salt-123",
  createdAt: new Date("2026-01-01T10:00:00Z"),
  updatedAt: new Date("2026-01-01T10:00:00Z"),
  ...overrides,
});
