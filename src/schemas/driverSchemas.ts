import { z } from "zod";
import { EntityStatus } from "@prisma/client";
import includeOptionsSchema from "./includeOptionsSchemas";
import paginationSchema from "./paginationSchemas";

/**
 * Zod schema for base driver shape.
 */
export const driverSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, { message: "Name is required" }),
  email: z.string().email({ message: "Invalid email format" }),
  phoneNumber: z.string().min(1, { message: "Phone number is required" }),
  licenseNumber: z.string().min(1, { message: "License number is required" }),
  experienceYears: z.number().nonnegative().optional().nullable(),
  status: z.nativeEnum(EntityStatus).default("ACTIVE"),
  isArchived: z.boolean().default(false),
  farmId: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/**
 * Schema for creating a new driver.
 */
export const createDriverSchema = driverSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isArchived: true,
});

/**
 * Schema for updating an existing driver.
 */
export const updateDriverSchema = driverSchema
  .pick({
    name: true,
    email: true,
    phoneNumber: true,
    licenseNumber: true,
    experienceYears: true,
  })
  .partial();

/**
 * Schema for updating driver availability status only.
 */
export const updateDriverStatusSchema = z.object({
  status: z.nativeEnum(EntityStatus),
});

/**
 * Input validation for getDriver by ID.
 */
export const DriverIdParamsSchema = z.object({
  id: z.string().uuid({ message: "Invalid driver ID format" }),
});

/**
 * Schema for filtering drivers with pagination.
 */
export const driversFilterQuerySchema = driverSchema
  .pick({
    status: true,
  })
  .partial()
  .extend({
    farmId: z.string().uuid({ message: "Invalid farm ID format" }).optional(),
    search: z.string().optional(),
    minExperience: z.coerce.number().int().nonnegative().optional(),
  })
  .merge(paginationSchema)
  .merge(includeOptionsSchema);

// Type inference for the schemas
export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;
export type UpdateDriverStatusInput = z.infer<typeof updateDriverStatusSchema>;
export type DriverIdParamsInput = z.infer<typeof DriverIdParamsSchema>;
export type DriversFilterQueryInput = z.infer<typeof driversFilterQuerySchema>;
