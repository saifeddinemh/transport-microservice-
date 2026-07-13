import type { MaintenanceLog, Vehicle } from "@prisma/client";
import { format } from "date-fns";
import type { VehicleModel } from "./vehicleModels";
import { mapPrismaVehicleToModel } from "./vehicleModels";

export interface MaintenanceLogModel {
  id: string;
  vehicleId: string;
  maintenanceType: string;
  cost: number;
  notes: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
  vehicle?: VehicleModel | null;
}

export const mapPrismaMaintenanceLogToModel = (log: MaintenanceLog): MaintenanceLogModel => ({
  id: log.id,
  vehicleId: log.vehicleId,
  maintenanceType: log.maintenanceType,
  cost: log.cost,
  notes: log.notes,
  date: format(log.date, "dd-MM-yyyy HH:mm"),
  createdAt: format(log.createdAt, "dd-MM-yyyy HH:mm"),
  updatedAt: format(log.updatedAt, "dd-MM-yyyy HH:mm"),
});

export const mapNestedPrismaMaintenanceLogToModel = (
  log: MaintenanceLog & { vehicle?: Vehicle | null }
): MaintenanceLogModel => ({
  id: log.id,
  vehicleId: log.vehicleId,
  maintenanceType: log.maintenanceType,
  cost: log.cost,
  notes: log.notes,
  date: format(log.date, "dd-MM-yyyy HH:mm"),
  createdAt: format(log.createdAt, "dd-MM-yyyy HH:mm"),
  updatedAt: format(log.updatedAt, "dd-MM-yyyy HH:mm"),
  vehicle: log.vehicle ? mapPrismaVehicleToModel(log.vehicle) : null,
});
