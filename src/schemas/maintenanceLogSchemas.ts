import { z } from "zod";
import { toUTCDateOnly } from "../utils/dateCalculations";
import includeOptionsSchema from "./includeOptionsSchemas";
import paginationSchema from "./paginationSchemas";

/**
 * Zod schema for base maintenance log shape.
 */
export const maintenanceLogSchema = z.object({
  id: z.string().uuid(),
  maintenanceType: z.string().min(3).max(30).trim(),
  cost: z.number().nonnegative("Cost must be a positive number"),
  notes: z.string().max(500).trim().optional().nullable(),
  date: z.coerce.date({ required_error: "Date is required" }),
  vehicleId: z.string().uuid("Invalid vehicle ID format"),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/**
 * Schema for creating a new maintenance log.
 */
export const createMaintenanceLogSchema = maintenanceLogSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * Schema for updating an existing maintenance log.
 */
export const updateMaintenanceLogSchema = maintenanceLogSchema
  .pick({
    maintenanceType: true,
    cost: true,
    notes: true,
    date: true,
  })
  .partial();

export const MaintenanceLogsIdParamsSchema = z.object({
  id: z.string().uuid({ message: "Invalid ID format" }),
});

export const maintenanceLogsFilterQuerySchema = maintenanceLogSchema
  .pick({
    vehicleId: true,
  })
  .partial()
  .extend({
    farmId: z.string().uuid({ message: "Invalid farm ID format" }).optional(),
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

export const getMaintenanceStatsQuerySchema = z.object({
  farmId: z.string().uuid("Invalid farm ID format").optional(),
  vehicleId: z.string().uuid("Invalid vehicle ID format").optional(),
  yearMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "yearMonth must be in YYYY-MM format")
    .optional(),
});

export type CreateMaintenanceLogInput = z.infer<typeof createMaintenanceLogSchema>;
export type UpdateMaintenanceLogInput = z.infer<typeof updateMaintenanceLogSchema>;
export type MaintenanceLogsIdParamsInput = z.infer<typeof MaintenanceLogsIdParamsSchema>;
export type MaintenanceLogsFilterQueryInput = z.infer<typeof maintenanceLogsFilterQuerySchema>;
export type GetMaintenanceStatsQueryInput = z.infer<typeof getMaintenanceStatsQuerySchema>;
