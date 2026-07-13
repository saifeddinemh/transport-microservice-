import type {
  Shipment,
  ShipmentStatus,
  Farm,
  TransportRequest,
  Vehicle,
  Driver,
  Transport,
  DeliveryProof,
} from "@prisma/client";
import { format } from "date-fns";
import type { FarmModel } from "./farmModels";
import { mapPrismaFarmToModel } from "./farmModels";
import type { TransportRequestModel } from "./transportRequestModels";
import type { VehicleModel } from "./vehicleModels";
import { mapPrismaVehicleToModel } from "./vehicleModels";
import type { DriverModel } from "./driverModels";
import { mapPrismaDriverToModel } from "./driverModels";
import type { TransporterModel } from "./transporterModels";
import type { DeliveryProofModel } from "./deliveryProofModels";
import { mapPrismaDeliveryProofToModel } from "./deliveryProofModels";

/**
 * TypeScript model representing the shipment entity in the API.
 */
export interface ShipmentModel {
  id: string;
  status: ShipmentStatus;
  startLocation: string;
  endLocation: string;
  wayPoints: string[];
  totalWeight: number;
  distanceKm: number | null;
  totalCost: number;
  estimatedArrival: string;
  requestId: string;
  farmId: string;
  vehicleId: string | null;
  driverId: string | null;
  transportId: string | null;
  vehicle?: VehicleModel | null;
  driver?: DriverModel | null;
  deliveryProofs?: DeliveryProofModel[] | null;
  farm?: FarmModel | null;
  transportRequest?: TransportRequestModel | null;
  transport?: TransporterModel | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Converts a Prisma `Shipment` type into an API-safe `ShipmentModel`.
 * @param shipment Prisma Shipment object
 * @returns API-safe ShipmentModel
 */
export const mapPrismaShipmentToModel = (shipment: Shipment): ShipmentModel => ({
  id: shipment.id,
  status: shipment.status as ShipmentStatus,
  startLocation: shipment.startLocation,
  endLocation: shipment.endLocation,
  wayPoints: shipment.wayPoints,
  totalWeight: shipment.totalWeight,
  distanceKm: shipment.distanceKm,
  totalCost: shipment.totalCost,
  estimatedArrival: format(shipment.estimatedArrival, "dd-MM-yyyy HH:mm"),
  requestId: shipment.requestId,
  farmId: shipment.farmId,
  vehicleId: shipment.vehicleId,
  driverId: shipment.driverId,
  transportId: shipment.transportId,
  createdAt: format(shipment.createdAt, "dd-MM-yyyy HH:mm"),
  updatedAt: format(shipment.updatedAt, "dd-MM-yyyy HH:mm"),
});

/**
 * Converts a Prisma `Shipment` type into an API-safe `ShipmentModel` with nested relations.
 * @param shipment Prisma Shipment object with relations
 * @returns API-safe ShipmentModel with nested relations
 */
export const mapNestedPrismaShipmentToModel = (
  shipment: Shipment & {
    farm?: Farm | null;
    vehicle?: Vehicle | null;
    driver?: Driver | null;
    transport?: Transport | null;
    transportRequest?: TransportRequest | null;
    deliveryProofs?: DeliveryProof[] | null;
  }
): ShipmentModel => ({
  id: shipment.id,
  status: shipment.status as ShipmentStatus,
  startLocation: shipment.startLocation,
  endLocation: shipment.endLocation,
  wayPoints: shipment.wayPoints,
  totalWeight: shipment.totalWeight,
  distanceKm: shipment.distanceKm,
  totalCost: shipment.totalCost,
  estimatedArrival: format(shipment.estimatedArrival, "dd-MM-yyyy HH:mm"),
  requestId: shipment.requestId,
  vehicleId: shipment.vehicleId,
  driverId: shipment.driverId,
  farmId: shipment.farmId,
  transportId: shipment.transportId,
  vehicle: shipment.vehicle ? mapPrismaVehicleToModel(shipment.vehicle) : null,
  driver: shipment.driver ? mapPrismaDriverToModel(shipment.driver) : null,
  deliveryProofs: shipment.deliveryProofs
    ? shipment.deliveryProofs.map(mapPrismaDeliveryProofToModel)
    : null,
  farm: shipment.farm ? mapPrismaFarmToModel(shipment.farm) : null,
  createdAt: format(shipment.createdAt, "dd-MM-yyyy HH:mm"),
  updatedAt: format(shipment.updatedAt, "dd-MM-yyyy HH:mm"),
});
