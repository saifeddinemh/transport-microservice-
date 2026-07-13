import type {
  TransportRequest,
  CategoryType,
  RequestStatus,
  Owner,
  Employee,
  Shipment,
  Farm,
} from "@prisma/client";
import { format } from "date-fns";
import type { OwnerModel } from "./ownerModels";
import { mapPrismaOwnerToModel } from "./ownerModels";
import type { EmployeeModel } from "./employeeModels";
import { mapPrismaEmployeeToModel } from "./employeeModels";
import type { ShipmentModel } from "./shipmentModels";
import { mapPrismaShipmentToModel } from "./shipmentModels";
import type { FarmModel } from "./farmModels";
import { mapPrismaFarmToModel } from "./farmModels";

/**
 * TypeScript model representing the TransportRequest entity in the API
 * Excludes sensitive fields and provides a clean interface
 */
export interface TransportRequestModel {
  id: string;
  requestedBy: string;
  source: string;
  destination: string;
  category: CategoryType;
  weight: number;
  requestDate: string;
  status: RequestStatus;
  specialRequirements: string | null;
  farmId: string;
  ownerId: string;
  employeeId: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: OwnerModel | null;
  employee?: EmployeeModel | null;
  shipment?: ShipmentModel | null;
  farm?: FarmModel | null;
}

/**
 * Converts a Prisma TransportRequest type into an API-safe TransportRequestModel
 * @param transportRequest Prisma TransportRequest object
 * @returns API-safe TransportRequestModel
 */
export const mapPrismaTransportRequestToModel = (
  transportRequest: TransportRequest
): TransportRequestModel => ({
  id: transportRequest.id,
  requestedBy: transportRequest.requestedBy,
  source: transportRequest.source,
  destination: transportRequest.destination,
  category: transportRequest.category,
  weight: transportRequest.weight,
  requestDate: format(transportRequest.requestDate, "dd-MM-yyyy HH:mm"),
  status: transportRequest.status,
  specialRequirements: transportRequest.specialRequirements,
  farmId: transportRequest.farmId,
  ownerId: transportRequest.ownerId,
  employeeId: transportRequest.employeeId,
  createdAt: format(transportRequest.createdAt, "dd-MM-yyyy HH:mm"),
  updatedAt: format(transportRequest.updatedAt, "dd-MM-yyyy HH:mm"),
});

/**
 * Maps Prisma TransportRequest with relations to extended model
 * @param transportRequest Prisma TransportRequest with relations
 * @returns TransportRequestWithRelations
 */
export const mapNestedPrismaTransportRequestToModel = (
  transportRequest: TransportRequest & {
    owner?: Owner | null;
    employee?: Employee | null;
    shipment?: Shipment | null;
    farm?: Farm | null;
  }
): TransportRequestModel => ({
  id: transportRequest.id,
  requestedBy: transportRequest.requestedBy,
  source: transportRequest.source,
  destination: transportRequest.destination,
  category: transportRequest.category,
  weight: transportRequest.weight,
  requestDate: format(transportRequest.requestDate, "dd-MM-yyyy HH:mm"),
  status: transportRequest.status,
  specialRequirements: transportRequest.specialRequirements,
  farmId: transportRequest.farmId,
  ownerId: transportRequest.ownerId,
  employeeId: transportRequest.employeeId,
  createdAt: format(transportRequest.createdAt, "dd-MM-yyyy HH:mm"),
  updatedAt: format(transportRequest.updatedAt, "dd-MM-yyyy HH:mm"),
  owner: transportRequest.owner ? mapPrismaOwnerToModel(transportRequest.owner) : null,
  employee: transportRequest.employee ? mapPrismaEmployeeToModel(transportRequest.employee) : null,
  shipment: transportRequest.shipment ? mapPrismaShipmentToModel(transportRequest.shipment) : null,
  farm: transportRequest.farm ? mapPrismaFarmToModel(transportRequest.farm) : null,
});
