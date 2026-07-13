import type {
  Farm,
  FarmOwner,
  Owner,
  Employee,
  Driver,
  Vehicle,
  Shipment,
  Transport,
  TransportRequest,
} from "@prisma/client";
import { format } from "date-fns";
import type { OwnerModel } from "./ownerModels";
import { mapPrismaOwnerToModel } from "./ownerModels";
import type { EmployeeModel } from "./employeeModels";
import { mapPrismaEmployeeToModel } from "./employeeModels";
import type { DriverModel } from "./driverModels";
import { mapPrismaDriverToModel } from "./driverModels";
import type { VehicleModel } from "./vehicleModels";
import { mapPrismaVehicleToModel } from "./vehicleModels";
import type { ShipmentModel } from "./shipmentModels";
import { mapPrismaShipmentToModel } from "./shipmentModels";
import type { TransporterModel } from "./transporterModels";
import { mapPrismaTransporterToModel } from "./transporterModels";
import type { TransportRequestModel } from "./transportRequestModels";
import { mapPrismaTransportRequestToModel } from "./transportRequestModels";

/**
 * TypeScript model representing the Farm entity in the API.
 */
export interface FarmModel {
  id: string;
  farmName: string;
  ownerId: string;
  address: string | null;
  country: string | null;
  city: string | null;
  postcode: string | null;
  totalArea: number | null;
  createdAt: string;
  updatedAt: string;
  owners?: OwnerModel[] | null;
  employees?: EmployeeModel[] | null;
  drivers?: DriverModel[] | null;
  vehicles?: VehicleModel[] | null;
  shipments?: ShipmentModel[] | null;
  transports?: TransporterModel[] | null;
  transportRequests?: TransportRequestModel[] | null;
}

/**
 * Converts a Prisma `Farm` type into an API-safe `FarmModel` (base).
 * Does not include nested relations.
 * * @param farm Prisma Farm object
 * @returns API-safe FarmModel
 */
export const mapPrismaFarmToModel = (farm: Farm): FarmModel => ({
  id: farm.id,
  farmName: farm.farmName,
  ownerId: farm.ownerId,
  address: farm.address,
  country: farm.country,
  city: farm.city,
  postcode: farm.postcode,
  totalArea: farm.totalArea,
  createdAt: format(farm.createdAt, "dd-MM-yyyy HH:mm"),
  updatedAt: format(farm.updatedAt, "dd-MM-yyyy HH:mm"),
});

/**
 * Converts a Prisma `Farm` type into an API-safe `FarmModel` (nested).
 * Maps through the pivot table `FarmOwner` to extract the actual `Owner` records.
 * * @param farm Prisma Farm object with nested includes
 * @returns API-safe FarmModel with relations
 */
export const mapNestedPrismaFarmToModel = (
  farm: Farm & {
    owners?: (FarmOwner & { owner: Owner })[] | null;
    employees?: Employee[] | null;
    drivers?: Driver[] | null;
    vehicles?: Vehicle[] | null;
    shipment?: Shipment[] | null;
    transport?: Transport[] | null;
    transportRequests?: TransportRequest[] | null;
  }
): FarmModel => ({
  id: farm.id,
  farmName: farm.farmName,
  ownerId: farm.ownerId,
  address: farm.address,
  country: farm.country,
  city: farm.city,
  postcode: farm.postcode,
  totalArea: farm.totalArea,
  createdAt: format(farm.createdAt, "dd-MM-yyyy HH:mm"),
  updatedAt: format(farm.updatedAt, "dd-MM-yyyy HH:mm"),
  owners: farm.owners ? farm.owners.map((fo) => mapPrismaOwnerToModel(fo.owner)) : null,
  employees: farm.employees ? farm.employees.map(mapPrismaEmployeeToModel) : null,
  drivers: farm.drivers ? farm.drivers.map(mapPrismaDriverToModel) : null,
  vehicles: farm.vehicles ? farm.vehicles.map(mapPrismaVehicleToModel) : null,
  shipments: farm.shipment ? farm.shipment.map(mapPrismaShipmentToModel) : null,
  transports: farm.transport ? farm.transport.map(mapPrismaTransporterToModel) : null,
  transportRequests: farm.transportRequests
    ? farm.transportRequests.map(mapPrismaTransportRequestToModel)
    : null,
});
