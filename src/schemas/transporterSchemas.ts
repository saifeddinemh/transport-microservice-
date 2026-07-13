import { z } from "zod";
import { EntityStatus } from "@prisma/client";
import { toUTCDateOnly } from "../utils/dateCalculations";
import includeOptionsSchema from "./includeOptionsSchemas";
import paginationSchema from "./paginationSchemas";

/**
 * Zod schema for base transporter shape.
 */
export const transporterSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(3, "Name must be at least 3 characters").max(50).trim(),
  email: z.string().email("Invalid email format").max(100).toLowerCase().trim(),
  phoneNumber: z.string().min(10, "Phone number too short").max(20).trim(),
  address: z.string().min(5, "Address is required").max(200).trim(),
  status: z.nativeEnum(EntityStatus).default("ACTIVE"),
  isArchived: z.boolean().default(false),
  farmId: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/**
 * Schema for creating a new transporter.
 */
export const createTransporterSchema = transporterSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isArchived: true,
});

/**
 * Schema for updating an existing transporter.
 */
export const updateTransporterSchema = transporterSchema
  .pick({
    name: true,
    email: true,
    phoneNumber: true,
    address: true,
  })
  .partial();

/**
 * Schema for updating transporter status only.
 */
export const updateTransporterStatusSchema = z.object({
  status: z.nativeEnum(EntityStatus),
});

/**
 * Input validation for getTransporter by ID.
 */
export const TransportersIdParamsSchema = z.object({
  id: z.string().uuid({ message: "Invalid ID format" }),
});

/**
 * Schema for filtering transporters with pagination.
 */
export const transportersFilterQuerySchema = transporterSchema
  .pick({
    status: true,
    farmId: true,
  })
  .partial()
  .extend({
    searchTerm: z.string().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .merge(paginationSchema)
  .merge(includeOptionsSchema)
  .refine((data) => (!data.startDate && !data.endDate) || (data.startDate && data.endDate), {
    message: "Both startDate and endDate must be provided together",
    path: ["startDate"],
  })
  .transform((data) => {
    if (data.startDate && data.endDate) {
      const startDate = toUTCDateOnly(data.startDate);
      const endDate = toUTCDateOnly(data.endDate);

      if (startDate > endDate) {
        throw new z.ZodError([
          {
            path: ["startDate"],
            message: "startDate must be before endDate",
            code: z.ZodIssueCode.custom,
          },
        ]);
      }

      return {
        ...data,
        startDate,
        endDate,
      };
    }
    return data;
  });

// Type inference for the schemas
export type CreateTransporterInput = z.infer<typeof createTransporterSchema>;
export type UpdateTransporterInput = z.infer<typeof updateTransporterSchema>;
export type UpdateTransporterStatusInput = z.infer<typeof updateTransporterStatusSchema>;
export type TransportersIdParamsInput = z.infer<typeof TransportersIdParamsSchema>;
export type TransportersFilterQueryInput = z.infer<typeof transportersFilterQuerySchema>;
