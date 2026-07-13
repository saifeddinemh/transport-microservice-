import { z } from "zod";
import { FuelType } from "@prisma/client";
import { toUTCDateOnly } from "../utils/dateCalculations";
import includeOptionsSchema from "./includeOptionsSchemas";
import paginationSchema from "./paginationSchemas";

/**
 * Zod schema for base fuel log shape
 */
export const fuelLogSchema = z.object({
  id: z.string().uuid(),
  fuelType: z.nativeEnum(FuelType),
  quantity: z.number().positive("Quantity must be positive"),
  cost: z.number().positive("Cost must be positive"),
  filledBy: z.string().min(1, "Filled by is required"),
  date: z.coerce.date({ required_error: "Date is required" }),
  odometerReading: z.number().min(0, "Odometer reading must be non-negative"),
  vehicleId: z.string().uuid("Invalid vehicle ID format"),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/**
 * Schema for creating a new fuel log entry
 */
export const createFuelLogSchema = fuelLogSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .refine((data) => data.odometerReading > 0, {
    message: "Odometer reading must be greater than 0",
    path: ["odometerReading"],
  });

/**
 * Schema for updating an existing fuel log
 */
export const updateFuelLogSchema = fuelLogSchema
  .pick({
    fuelType: true,
    quantity: true,
    cost: true,
    filledBy: true,
    date: true,
    odometerReading: true,
  })
  .partial()
  .refine((data) => !data.odometerReading || data.odometerReading > 0, {
    message: "Odometer reading must be greater than 0",
    path: ["odometerReading"],
  });

/**
 * Schema for fuel log ID parameters
 */
export const fuelLogIdParamsSchema = z.object({
  id: z.string().uuid({ message: "Invalid fuel log ID format" }),
});

export const vehicleIdParamsSchema = z.object({
  vehicleId: z.string().uuid({ message: "Invalid vehicle ID format" }),
});

/**
 * Schema for filtering fuel logs
 */
export const fuelLogsFilterQuerySchema = fuelLogSchema
  .pick({
    fuelType: true,
    vehicleId: true,
  })
  .partial()
  .extend({
    farmId: z.string().uuid({ message: "Invalid farm ID format" }),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    minQuantity: z.coerce.number().min(0).optional(),
    maxQuantity: z.coerce.number().min(0).optional(),
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

/**
 * Schema for consumption stats query
 */
export const consumptionStatsQuerySchema = z
  .object({
    vehicleId: z.string().uuid().optional(),
    period: z.enum(["day", "week", "month", "year"]).default("month"),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .refine((data) => (!data.startDate && !data.endDate) || (data.startDate && data.endDate), {
    message: "Both startDate and endDate must be provided together",
    path: ["startDate"],
  })
  .transform((data) => {
    if (data.startDate && data.endDate) {
      return {
        ...data,
        startDate: toUTCDateOnly(data.startDate),
        endDate: toUTCDateOnly(data.endDate),
      };
    }
    return data;
  });

/**
 * Schema for cost stats query
 */
export const costStatsQuerySchema = z
  .object({
    vehicleId: z.string().uuid().optional(),
    groupBy: z.enum(["vehicle", "fuelType", "month"]).default("month"),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .refine((data) => (!data.startDate && !data.endDate) || (data.startDate && data.endDate), {
    message: "Both startDate and endDate must be provided together",
    path: ["startDate"],
  })
  .transform((data) => {
    if (data.startDate && data.endDate) {
      return {
        ...data,
        startDate: toUTCDateOnly(data.startDate),
        endDate: toUTCDateOnly(data.endDate),
      };
    }
    return data;
  });

// Type inference for the schemas
export type CreateFuelLogInput = z.infer<typeof createFuelLogSchema>;
export type UpdateFuelLogInput = z.infer<typeof updateFuelLogSchema>;
export type FuelLogIdParamsInput = z.infer<typeof fuelLogIdParamsSchema>;
export type VehicleIdParamsInput = z.infer<typeof vehicleIdParamsSchema>;
export type FuelLogsFilterQueryInput = z.infer<typeof fuelLogsFilterQuerySchema>;
export type ConsumptionStatsQueryInput = z.infer<typeof consumptionStatsQuerySchema>;
export type CostStatsQueryInput = z.infer<typeof costStatsQuerySchema>;
