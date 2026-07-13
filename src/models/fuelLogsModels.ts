import type { FuelLog, Vehicle, FuelType } from "@prisma/client";
import { format } from "date-fns";
import type { VehicleModel } from "./vehicleModels";
import { mapPrismaVehicleToModel } from "./vehicleModels";

/**
 * TypeScript model representing the fuel log entity in the API
 */
export interface FuelLogModel {
  id: string;
  fuelType: FuelType;
  quantity: number;
  cost: number;
  filledBy: string;
  date: string;
  odometerReading: number;
  vehicleId: string;
  createdAt: string;
  updatedAt: string;
  vehicle?: VehicleModel | null;
}

export interface ConsumptionStatsModel {
  totalLiters: number;
  totalCost: number;
  averageCostPerLiter: number;
  averageConsumption: number | null;
  totalDistance: number | null;
  vehicleCount: number;
  period: string;
}

export interface FuelTypeBreakdown {
  fuelType: FuelType;
  totalLiters: number;
  totalCost: number;
  averageCostPerLiter: number;
}

export interface CostStatsModel {
  period: string;
  totalCost: number;
  averageCostPerLiter: number;
  vehicleCount: number;
  fuelTypeBreakdown: FuelTypeBreakdown[];
}

/**
 * Converts a Prisma FuelLog type into an API-safe FuelLogModel
 */
export const mapPrismaFuelLogToModel = (fuelLog: FuelLog): FuelLogModel => ({
  id: fuelLog.id,
  fuelType: fuelLog.fuelType,
  quantity: fuelLog.quantity,
  cost: fuelLog.cost,
  filledBy: fuelLog.filledBy,
  date: format(fuelLog.date, "dd-MM-yyyy HH:mm"),
  odometerReading: fuelLog.odometerReading,
  vehicleId: fuelLog.vehicleId,
  createdAt: format(fuelLog.createdAt, "dd-MM-yyyy HH:mm"),
  updatedAt: format(fuelLog.updatedAt, "dd-MM-yyyy HH:mm"),
});

/**
 * Converts a Prisma FuelLog with nested vehicle to FuelLogModel
 */
export const mapNestedPrismaFuelLogToModel = (
  fuelLog: FuelLog & { vehicle?: Vehicle | null }
): FuelLogModel => ({
  id: fuelLog.id,
  fuelType: fuelLog.fuelType,
  quantity: fuelLog.quantity,
  cost: fuelLog.cost,
  filledBy: fuelLog.filledBy,
  date: format(fuelLog.date, "dd-MM-yyyy HH:mm"),
  odometerReading: fuelLog.odometerReading,
  vehicleId: fuelLog.vehicleId,
  vehicle: fuelLog.vehicle ? mapPrismaVehicleToModel(fuelLog.vehicle) : null,
  createdAt: format(fuelLog.createdAt, "dd-MM-yyyy HH:mm"),
  updatedAt: format(fuelLog.updatedAt, "dd-MM-yyyy HH:mm"),
});
