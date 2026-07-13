import type { Driver, EntityStatus, Shipment } from "@prisma/client";
import { format } from "date-fns";
import type { FarmModel } from "./farmModels";
import type { ShipmentModel } from "./shipmentModels";
import { mapPrismaShipmentToModel } from "./shipmentModels";

/**
 * TypeScript model representing the driver entity in the API.
 */
export interface DriverModel {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  licenseNumber: string;
  experienceYears: number | null;
  status: EntityStatus;
  farmId: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  farm?: FarmModel | null;
  shipments?: ShipmentModel[] | null;
}

/**
 * Converts a Prisma `Driver` type into an API-safe `DriverModel`.
 * @param driver Prisma Driver object
 * @returns API-safe DriverModel
 */
export const mapPrismaDriverToModel = (driver: Driver): DriverModel => ({
  id: driver.id,
  name: driver.name,
  email: driver.email,
  phoneNumber: driver.phoneNumber,
  licenseNumber: driver.licenseNumber,
  experienceYears: driver.experienceYears ?? null,
  status: driver.status as EntityStatus,
  farmId: driver.farmId,
  createdAt: format(driver.createdAt, "dd-MM-yyyy HH:mm"),
  updatedAt: format(driver.updatedAt, "dd-MM-yyyy HH:mm"),
  isArchived: driver.isArchived,
});

/**
 * Converts a Prisma `Driver` type into an API-safe `DriverModel` with nested relations.
 * @param driver Prisma Driver object with relations
 * @returns API-safe DriverModel with nested shipments
 */
export const mapNestedPrismaDriverToModel = (
  driver: Driver & {
    shipments?: Shipment[] | null;
  }
): DriverModel => ({
  id: driver.id,
  name: driver.name,
  email: driver.email,
  phoneNumber: driver.phoneNumber,
  licenseNumber: driver.licenseNumber,
  experienceYears: driver.experienceYears ?? null,
  status: driver.status as EntityStatus,
  farmId: driver.farmId,
  shipments: driver.shipments ? driver.shipments.map(mapPrismaShipmentToModel) : null,
  createdAt: format(driver.createdAt, "dd-MM-yyyy HH:mm"),
  updatedAt: format(driver.updatedAt, "dd-MM-yyyy HH:mm"),
  isArchived: driver.isArchived,
});
