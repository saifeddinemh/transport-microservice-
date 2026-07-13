import type { Role, Employee, Status, Farm, TransportRequest } from "@prisma/client";
import { format } from "date-fns";
import type { FarmModel } from "./farmModels";
import { mapPrismaFarmToModel } from "./farmModels";
import type { TransportRequestModel } from "./transportRequestModels";
import { mapPrismaTransportRequestToModel } from "./transportRequestModels";

/**
 * TypeScript model representing the Employee entity in the API.
 */
export interface EmployeeModel {
  id: string;
  email?: string | null;
  firstName: string;
  lastName: string;
  telephone: string | null;
  role: Role;
  transport: number;
  createdAt: string;
  updatedAt: string;
  farmId: string;
  status: Status;
  farm?: FarmModel | null;
  transportRequests?: TransportRequestModel[] | null;
}

/**
 * Converts a Prisma `Employee` type into an API-safe `EmployeeModel`.
 * @param Employee Prisma Employee object
 * @returns API-safe EmployeeModel
 */
export const mapPrismaEmployeeToModel = (employee: Employee): EmployeeModel => ({
  id: employee.id,
  email: employee.email ?? null,
  firstName: employee.firstName,
  lastName: employee.lastName,
  telephone: employee.telephone,
  role: employee.role,
  transport: employee.transport,
  createdAt: format(employee.createdAt, "dd-MM-yyyy HH:mm"),
  updatedAt: format(employee.updatedAt, "dd-MM-yyyy HH:mm"),
  farmId: employee.farmId,
  status: employee.status,
});

export const mapNestedPrismaEmployeeToModel = (
  employee: Employee & {
    farm?: Farm | null;
    transportRequests?: TransportRequest[] | null;
  }
): EmployeeModel => ({
  id: employee.id,
  email: employee.email ?? null,
  firstName: employee.firstName,
  lastName: employee.lastName,
  telephone: employee.telephone,
  role: employee.role,
  transport: employee.transport,
  createdAt: format(employee.createdAt, "dd-MM-yyyy HH:mm"),
  updatedAt: format(employee.updatedAt, "dd-MM-yyyy HH:mm"),
  farmId: employee.farmId,
  status: employee.status,
  farm: employee.farm ? mapPrismaFarmToModel(employee.farm) : null,
  transportRequests: employee.transportRequests
    ? employee.transportRequests.map(mapPrismaTransportRequestToModel)
    : null,
});
