import type {
  Vehicle,
  VehicleType,
  VehicleStatus,
  FuelType,
  MaintenanceLog,
  FuelLog,
  Farm,
  Shipment,
} from "@prisma/client";
import { format } from "date-fns";
import type { FarmModel } from "./farmModels";
import { mapPrismaFarmToModel } from "./farmModels";
import type { MaintenanceLogModel } from "./maintenanceLogsModels";
import { mapPrismaMaintenanceLogToModel } from "./maintenanceLogsModels";
import type { FuelLogModel } from "./fuelLogsModels";
import { mapPrismaFuelLogToModel } from "./fuelLogsModels";
import type { ShipmentModel } from "./shipmentModels";
import { mapPrismaShipmentToModel } from "./shipmentModels";

/**
 * TypeScript model representing the vehicle entity in the API.
 */
export interface VehicleModel {
  id: string;
  farmId: string;
  plateNumber: string;
  type: VehicleType;
  status: VehicleStatus;
  capacity: number;
  fuelLevel: number;
  fuelType: FuelType;
  lastMaintenance: string | null;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  farm?: FarmModel | null;
  maintenanceLogs?: MaintenanceLogModel[] | null;
  fuelLogs?: FuelLogModel[] | null;
  shipments?: ShipmentModel[] | null;
}

/**
 * Converts a Prisma `Vehicle` type into an API-safe `VehicleModel`.
 * @param vehicle Prisma Vehicle object
 * @returns API-safe VehicleModel
 */
export const mapPrismaVehicleToModel = (vehicle: Vehicle): VehicleModel => ({
  id: vehicle.id,
  farmId: vehicle.farmId,
  plateNumber: vehicle.plateNumber,
  type: vehicle.type as VehicleType,
  status: vehicle.status as VehicleStatus,
  capacity: vehicle.capacity,
  fuelLevel: vehicle.fuelLevel,
  fuelType: vehicle.fuelType as FuelType,
  lastMaintenance: vehicle.lastMaintenance
    ? format(vehicle.lastMaintenance, "dd-MM-yyyy HH:mm")
    : null,
  createdAt: format(vehicle.createdAt, "dd-MM-yyyy HH:mm"),
  updatedAt: format(vehicle.updatedAt, "dd-MM-yyyy HH:mm"),
  isArchived: vehicle.isArchived,
});

/**
 * Converts a Prisma `Vehicle` with nested relations into an API-safe model.
 */
export const mapNestedPrismaVehicleToModel = (
  vehicle: Vehicle & {
    farm?: Farm | null;
    maintenanceLogs?: MaintenanceLog[] | null;
    fuelLogs?: FuelLog[] | null;
    shipments?: Shipment[] | null;
  }
): VehicleModel => ({
  id: vehicle.id,
  farmId: vehicle.farmId,
  plateNumber: vehicle.plateNumber,
  type: vehicle.type as VehicleType,
  status: vehicle.status as VehicleStatus,
  capacity: vehicle.capacity,
  fuelType: vehicle.fuelType as FuelType,
  fuelLevel: vehicle.fuelLevel,
  lastMaintenance: vehicle.lastMaintenance
    ? format(vehicle.lastMaintenance, "dd-MM-yyyy HH:mm")
    : null,
  farm: vehicle.farm ? mapPrismaFarmToModel(vehicle.farm) : null,
  maintenanceLogs: vehicle.maintenanceLogs
    ? vehicle.maintenanceLogs.map(mapPrismaMaintenanceLogToModel)
    : null,
  fuelLogs: vehicle.fuelLogs ? vehicle.fuelLogs.map(mapPrismaFuelLogToModel) : null,
  shipments: vehicle.shipments ? vehicle.shipments.map(mapPrismaShipmentToModel) : null,
  createdAt: format(vehicle.createdAt, "dd-MM-yyyy HH:mm"),
  updatedAt: format(vehicle.updatedAt, "dd-MM-yyyy HH:mm"),
  isArchived: vehicle.isArchived,
});
