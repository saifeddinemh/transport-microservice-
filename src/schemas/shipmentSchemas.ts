import { z } from "zod";
import { ShipmentStatus } from "@prisma/client";
import includeOptionsSchema from "./includeOptionsSchemas";
import paginationSchema from "./paginationSchemas";

/**
 * Define allowed state transitions for a shipment.
 */
export const SHIPMENT_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["PLANNED", "CANCELLED"],
  PLANNED: ["IN_TRANSIT", "CANCELLED", "PENDING"],
  IN_TRANSIT: ["DELIVERED", "RETURNED"],
  DELIVERED: [],
  RETURNED: [],
  CANCELLED: [],
};

/**
 * Zod schema for base shipment shape.
 */
export const shipmentSchema = z.object({
  id: z.string().uuid(),
  status: z.nativeEnum(ShipmentStatus).default(ShipmentStatus.PENDING),
  startLocation: z.string().min(2),
  endLocation: z.string().min(2),
  wayPoints: z.array(z.string()).default([]),
  totalWeight: z.number().positive(),
  distanceKm: z.number().positive().optional().nullable(),
  totalCost: z.number().nonnegative(),
  estimatedArrival: z.coerce.date({ required_error: "Estimated arrival is required" }),
  requestId: z.string().uuid(),
  farmId: z.string().uuid(),
  vehicleId: z.string().uuid().optional().nullable(),
  driverId: z.string().uuid().optional().nullable(),
  transportId: z.string().uuid().optional().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/**
 * Schema for creating a new shipment.
 *
 * A shipment may be created:
 *  - UNASSIGNED (no vehicleId, driverId, or transportId — assigned later via update)
 *  - INTERNAL (vehicleId + driverId, no transportId)
 *  - EXTERNAL (transportId only, no vehicleId/driverId)
 * Any other combination (e.g. only a vehicleId, or vehicle+transport together) is invalid.
 */
export const createShipmentSchema = shipmentSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .refine(
    (data) => {
      const hasVehicle = !!data.vehicleId;
      const hasDriver = !!data.driverId;
      const hasTransport = !!data.transportId;

      const isInternal = hasVehicle && hasDriver && !hasTransport;
      const isExternal = !hasVehicle && !hasDriver && hasTransport;
      const isUnassigned = !hasVehicle && !hasDriver && !hasTransport;

      return isInternal || isExternal || isUnassigned;
    },
    {
      message:
        "Shipment must be unassigned, INTERNAL (vehicleId + driverId), or EXTERNAL (transportId) — not a mix.",
      path: ["vehicleId", "driverId", "transportId"],
    }
  );

/**
 * Schema for updating an existing shipment.
 */
export const updateShipmentSchema = shipmentSchema
  .pick({
    startLocation: true,
    endLocation: true,
    wayPoints: true,
    totalWeight: true,
    totalCost: true,
    estimatedArrival: true,
    vehicleId: true,
    driverId: true,
    transportId: true,
  })
  .partial();

/**
 * Schema for updating shipment status only.
 * Validates that the transition is allowed.
 */
export const updateShipmentStatusSchema = z.object({
  status: z.nativeEnum(ShipmentStatus),
});

/**
 * Input validation for getShipment by ID.
 */
export const shipmentIdParamsSchema = z.object({
  id: z.string().uuid({ message: "Invalid Shipment ID format" }),
});

/**
 * Schema for filtering shipments with pagination.
 */
export const shipmentsFilterQuerySchema = shipmentSchema
  .pick({
    status: true,
    farmId: true,
    vehicleId: true,
    driverId: true,
    transportId: true,
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
      const startDate = new Date(data.startDate);
      startDate.setUTCHours(0, 0, 0, 0);

      const endDate = new Date(data.endDate);
      endDate.setUTCHours(23, 59, 59, 999);

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

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;
export type UpdateShipmentInput = z.infer<typeof updateShipmentSchema>;
export type UpdateShipmentStatusInput = z.infer<typeof updateShipmentStatusSchema>;
export type ShipmentIdParamsInput = z.infer<typeof shipmentIdParamsSchema>;
export type ShipmentsFilterQueryInput = z.infer<typeof shipmentsFilterQuerySchema>;
