import type { TransportationContract, ContractType, EntityStatus, Transport } from "@prisma/client";
import { format } from "date-fns";
import type { TransporterModel } from "./transporterModels";
import { mapPrismaTransporterToModel } from "./transporterModels";

/**
 * TypeScript model representing the TransportationContract entity in the API.
 */
export interface TransportationContractModel {
  id: string;
  startDate: string;
  endDate: string | null;
  contractType: ContractType;
  pricePerKm: number;
  maxWeight: number;
  status: EntityStatus;
  serviceType: string | null;
  terms: string | null;
  isArchived: boolean;
  transportId: string;
  createdAt: string;
  updatedAt: string;
  transport?: TransporterModel | null;
}

/**
 * Converts a Prisma `TransportationContract` type into an API-safe `TransportationContractModel`.
 * @param contract Prisma TransportationContract object
 * @returns API-safe TransportationContractModel
 */
export const mapPrismaTransportationContractToModel = (
  contract: TransportationContract
): TransportationContractModel => ({
  id: contract.id,
  startDate: format(contract.startDate, "dd-MM-yyyy HH:mm"),
  endDate: contract.endDate ? format(contract.endDate, "dd-MM-yyyy HH:mm") : null,
  contractType: contract.contractType,
  pricePerKm: contract.pricePerKm,
  maxWeight: contract.maxWeight,
  status: contract.status,
  serviceType: contract.serviceType,
  terms: contract.terms,
  isArchived: contract.isArchived,
  transportId: contract.transportId,
  createdAt: format(contract.createdAt, "dd-MM-yyyy HH:mm"),
  updatedAt: format(contract.updatedAt, "dd-MM-yyyy HH:mm"),
});

/**
 * Converts a Prisma `TransportationContract` type into an API-safe `TransportationContractModel` with nested relations.
 * @param contract Prisma TransportationContract object
 * @returns API-safe TransportationContractModel
 */
export const mapNestedPrismaTransportationContractToModel = (
  contract: TransportationContract & { transport?: Transport | null }
): TransportationContractModel => ({
  id: contract.id,
  startDate: format(contract.startDate, "dd-MM-yyyy HH:mm"),
  endDate: contract.endDate ? format(contract.endDate, "dd-MM-yyyy HH:mm") : null,
  contractType: contract.contractType,
  pricePerKm: contract.pricePerKm,
  maxWeight: contract.maxWeight,
  status: contract.status,
  serviceType: contract.serviceType,
  terms: contract.terms,
  isArchived: contract.isArchived,
  transportId: contract.transportId,
  createdAt: format(contract.createdAt, "dd-MM-yyyy HH:mm"),
  updatedAt: format(contract.updatedAt, "dd-MM-yyyy HH:mm"),
  transport: contract.transport ? mapPrismaTransporterToModel(contract.transport) : null,
});
