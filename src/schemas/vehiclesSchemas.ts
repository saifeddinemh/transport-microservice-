import { z } from "zod";
import { VehicleType, VehicleStatus, FuelType } from "@prisma/client";
import { toUTCDateOnly } from "../utils/dateCalculations";
import includeOptionsSchema from "./includeOptionsSchemas";
import paginationSchema from "./paginationSchemas";

export const vehicleSchema = z.object({
  id: z.string().uuid(),
  plateNumber: z.string().min(2).max(20),
  type: z.nativeEnum(VehicleType),
  status: z.nativeEnum(VehicleStatus).default(VehicleStatus.AVAILABLE),
  capacity: z.number().positive({ message: "Capacity must be a positive number" }),
  fuelType: z.nativeEnum(FuelType),
  fuelLevel: z.number().min(0).max(100, { message: "Fuel level must be between 0 and 100" }),
  lastMaintenance: z.coerce.date().optional().nullable(),
  isArchived: z.boolean().default(false),
  farmId: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/**
 * Schema for creating a new vehicle.
 */
export const createVehicleSchema = vehicleSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    isArchived: true,
  })
  .extend({
    fuelLevel: z.number().min(0).max(100).optional().default(0),
    lastMaintenance: z.coerce.date().optional().nullable(),
  })
  .transform((data) => {
    return {
      ...data,
      fuelLevel: data.fuelLevel ?? 0,
      lastMaintenance: data.lastMaintenance ? toUTCDateOnly(data.lastMaintenance) : null,
    };
  });

/**
 * Schema for updating an existing vehicle.
 */
export const updateVehicleSchema = vehicleSchema
  .pick({
    plateNumber: true,
    type: true,
    capacity: true,
    fuelType: true,
    fuelLevel: true,
    lastMaintenance: true,
  })
  .partial()
  .transform((data) => {
    return {
      ...data,
      lastMaintenance: data.lastMaintenance ? toUTCDateOnly(data.lastMaintenance) : undefined,
    };
  });

/**
 * Schema for updating vehicle availability status only.
 */
export const updateVehicleStatusSchema = z.object({
  status: z.nativeEnum(VehicleStatus),
});

/**
 * Input validation for getVehicle by ID.
 */
export const vehiclesIdParamsSchema = z.object({
  id: z.string().uuid({ message: "Invalid vehicle ID format" }),
});

/**
 * Schema for filtering vehicles with pagination and optional date range.
 */
export const vehiclesFilterQuerySchema = vehicleSchema
  .pick({
    type: true,
    status: true,
    fuelType: true,
    farmId: true,
  })
  .partial()
  .extend({
    minCapacity: z.coerce.number().positive().optional(),
    maxCapacity: z.coerce.number().positive().optional(),
    available: z.coerce.boolean().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .merge(paginationSchema)
  .merge(includeOptionsSchema)
  .refine(
    (data) =>
      (!data.minCapacity && !data.maxCapacity) || (data.minCapacity && data.maxCapacity)
        ? true
        : true,
    {
      message: "Both minCapacity and maxCapacity must be provided together",
      path: ["minCapacity"],
    }
  )
  .refine((data) => (!data.startDate && !data.endDate) || (data.startDate && data.endDate), {
    message: "Both lastMaintenanceStart and lastMaintenanceEnd must be provided together",
    path: ["lastMaintenanceStart"],
  })
  .transform((data) => {
    if (data.minCapacity && data.maxCapacity && data.minCapacity > data.maxCapacity) {
      throw new z.ZodError([
        {
          path: ["minCapacity"],
          message: "minCapacity must be less than or equal to maxCapacity",
          code: z.ZodIssueCode.custom,
        },
      ]);
    }

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

      return { ...data, startDate, endDate };
    }

    return data;
  });

// Type inference for the schemas
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type UpdateVehicleStatusInput = z.infer<typeof updateVehicleStatusSchema>;
export type VehiclesIdParamsInput = z.infer<typeof vehiclesIdParamsSchema>;
export type VehiclesFilterQueryInput = z.infer<typeof vehiclesFilterQuerySchema>;
