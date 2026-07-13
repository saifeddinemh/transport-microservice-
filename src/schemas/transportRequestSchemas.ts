import { z } from "zod";
import { RequestStatus, CategoryType } from "@prisma/client";
import { toUTCDateOnly } from "../utils/dateCalculations";
import includeOptionsSchema from "./includeOptionsSchemas";
import paginationSchema from "./paginationSchemas";

/**
 * Zod schema for base transport request shape.
 */
export const transportRequestSchema = z.object({
  id: z.string().uuid(),
  requestedBy: z.string().min(2, "Requested by is required").trim(),
  source: z.string().min(2, "Source is required").trim(),
  destination: z.string().min(2, "Destination is required").trim(),
  category: z.nativeEnum(CategoryType),
  weight: z.number().positive("Weight must be positive"),
  requestDate: z.coerce.date({ required_error: "Request date is required" }),
  status: z.nativeEnum(RequestStatus).default("PENDING"),
  specialRequirements: z.string().nullable().optional(),
  farmId: z.string().uuid(),
  ownerId: z.string().uuid(),
  employeeId: z.string().uuid().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/**
 * Schema for creating a new transport request.
 */
export const createTransportRequestSchema = transportRequestSchema
  .omit({
    id: true,
    status: true,
    createdAt: true,
    updatedAt: true,
  })
  .transform((data) => {
    return {
      ...data,
      requestDate: toUTCDateOnly(data.requestDate),
    };
  });

/**
 * Schema for updating an existing transport request.
 */
export const updateTransportRequestSchema = transportRequestSchema
  .pick({
    requestedBy: true,
    source: true,
    destination: true,
    category: true,
    weight: true,
    requestDate: true,
    specialRequirements: true,
  })
  .partial()
  .transform((data) => {
    return {
      ...data,
      requestDate: data.requestDate ? toUTCDateOnly(data.requestDate) : undefined,
    };
  });

/**
 * Schema for updating request status.
 */
export const updateTransportRequestStatusSchema = z.object({
  status: z.nativeEnum(RequestStatus),
});

/**
 * Input validation for getTransportRequest by ID.
 */
export const TransportRequestsIdParamsSchema = z.object({
  id: z.string().uuid({ message: "Invalid ID format" }),
});

/**
 * Schema for filtering transport requests with pagination.
 */
export const transportRequestsFilterQuerySchema = transportRequestSchema
  .pick({
    status: true,
    category: true,
    farmId: true,
    ownerId: true,
  })
  .partial()
  .extend({
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

/**
 * Schema for converting a transport request to INTERNAL shipment
 */
export const convertToInternalShipmentSchema = z.object({
  vehicleId: z.string().uuid("Vehicle ID is required"),
  driverId: z.string().uuid("Driver ID is required"),
  estimatedArrival: z.coerce.date(),
  wayPoints: z.array(z.string()).default([]),
  totalCost: z.number().nonnegative().default(0),
});

/**
 * Schema for converting a transport request to EXTERNAL shipment
 */
export const convertToExternalShipmentSchema = z.object({
  transportId: z.string().uuid("Transport ID is required"),
  vehicleId: z.string().uuid().optional().nullable(),
  driverId: z.string().uuid().optional().nullable(),
  estimatedArrival: z.coerce.date(),
  totalCost: z.number().nonnegative("Total cost is required"),
  wayPoints: z.array(z.string()).default([]),
});

// Type inference for the schemas
export type CreateTransportRequestInput = z.infer<typeof createTransportRequestSchema>;
export type UpdateTransportRequestInput = z.infer<typeof updateTransportRequestSchema>;
export type UpdateTransportRequestStatusInput = z.infer<typeof updateTransportRequestStatusSchema>;
export type TransportRequestsIdParamsInput = z.infer<typeof TransportRequestsIdParamsSchema>;
export type TransportRequestsFilterQueryInput = z.infer<typeof transportRequestsFilterQuerySchema>;
export type ConvertToInternalShipmentInput = z.infer<typeof convertToInternalShipmentSchema>;
export type ConvertToExternalShipmentInput = z.infer<typeof convertToExternalShipmentSchema>;
