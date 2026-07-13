import { z } from "zod";

/**
 * Zod schema for Owner entity validation.
 */
export const ownerSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  telephone: z.string().min(8),
  birthDate: z.coerce.date(),
  identityType: z.string().optional().nullable(),
  identityNumber: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postcode: z.string().optional().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  salt: z.string(),
});

/**
 * Zod schema for registring a new Owner.
 */
export const registerOwnerSchema = ownerSchema.pick({
  email: true,
  password: true,
  firstName: true,
  lastName: true,
  telephone: true,
  birthDate: true,
});

export type RegisterOwnerInput = z.infer<typeof registerOwnerSchema>;

/**
 * Zod schema for Owner login.
 */
export const loginOwnerSchema = ownerSchema.pick({
  email: true,
  password: true,
});

export type LoginOwnerInput = z.infer<typeof loginOwnerSchema>;

/**
 * Zod schema for creating a new Owner.
 */
export const createOwnerSchema = ownerSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
