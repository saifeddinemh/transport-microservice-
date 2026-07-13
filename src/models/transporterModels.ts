import type {
  Transport,
  EntityStatus,
  Farm,
  TransportationContract,
  Shipment,
} from "@prisma/client";
import { format } from "date-fns";
import type { FarmModel } from "./farmModels";
import { mapPrismaFarmToModel } from "./farmModels";
import type { TransportationContractModel } from "./transportationContractModels";
import { mapPrismaTransportationContractToModel } from "./transportationContractModels";
import type { ShipmentModel } from "./shipmentModels";
import { mapPrismaShipmentToModel } from "./shipmentModels";

/**
 * TypeScript model representing the Transport entity in the API.
 */
export interface TransporterModel {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  address: string;
  status: EntityStatus;
  isArchived: boolean;
  farmId: string;
  createdAt: string;
  updatedAt: string;
  farm?: FarmModel | null;
  contracts?: TransportationContractModel[] | null;
  shipments?: ShipmentModel[] | null;
}

/**
 * Converts a Prisma `Transport` type into an API-safe `TransporterModel`.
 * @param transport Prisma Transport object
 * @returns API-safe TransporterModel
 */
export const mapPrismaTransporterToModel = (transport: Transport): TransporterModel => ({
  id: transport.id,
  name: transport.name,
  email: transport.email,
  phoneNumber: transport.phoneNumber,
  address: transport.address,
  status: transport.status,
  isArchived: transport.isArchived,
  farmId: transport.farmId,
  createdAt: format(transport.createdAt, "dd-MM-yyyy HH:mm"),
  updatedAt: format(transport.updatedAt, "dd-MM-yyyy HH:mm"),
});

/**
 * Converts a Prisma `Transport` type into an API-safe `TransporterModel` with nested relations.
 * @param transport Prisma Transport object
 * @returns API-safe TransporterModel
 */
export const mapNestedPrismaTransporterToModel = (
  transport: Transport & {
    farm?: Farm | null;
    contracts?: TransportationContract[] | null;
    shipment?: Shipment[] | null;
  }
): TransporterModel => ({
  id: transport.id,
  name: transport.name,
  email: transport.email,
  phoneNumber: transport.phoneNumber,
  address: transport.address,
  status: transport.status,
  isArchived: transport.isArchived,
  farmId: transport.farmId,
  createdAt: format(transport.createdAt, "dd-MM-yyyy HH:mm"),
  updatedAt: format(transport.updatedAt, "dd-MM-yyyy HH:mm"),
  farm: transport.farm ? mapPrismaFarmToModel(transport.farm) : null,
  contracts: transport.contracts
    ? transport.contracts.map(mapPrismaTransportationContractToModel)
    : null,
  shipments: transport.shipment ? transport.shipment.map(mapPrismaShipmentToModel) : null,
});
