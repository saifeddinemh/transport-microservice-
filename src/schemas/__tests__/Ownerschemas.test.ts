import { describe, expect, it } from "vitest";
import { loginOwnerSchema, registerOwnerSchema } from "../ownerSchemas";

describe("loginOwnerSchema", () => {
  it("accepts a valid email/password payload", () => {
    const result = loginOwnerSchema.safeParse({
      email: "owner@agrofield.com",
      password: "SuperSecret123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = loginOwnerSchema.safeParse({
      email: "not-an-email",
      password: "SuperSecret123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = loginOwnerSchema.safeParse({
      email: "owner@agrofield.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unexpected extra field silently stripped or payload without password", () => {
    const result = loginOwnerSchema.safeParse({
      email: "owner@agrofield.com",
    });
    expect(result.success).toBe(false);
  });
});

describe("registerOwnerSchema", () => {
  it("accepts a complete valid registration payload", () => {
    const result = registerOwnerSchema.safeParse({
      email: "owner@agrofield.com",
      password: "SuperSecret123",
      firstName: "Amine",
      lastName: "Benali",
      telephone: "0612345678",
      birthDate: "1990-01-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a payload missing required fields", () => {
    const result = registerOwnerSchema.safeParse({
      email: "owner@agrofield.com",
      password: "SuperSecret123",
    });
    expect(result.success).toBe(false);
  });
});
