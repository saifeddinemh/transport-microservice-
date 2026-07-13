import { EmployeeCreatedPayload } from "../../schemas/hrEvents.schemas.js";
import { kafkaLogger } from "../../logger.js";
import prisma from "../../../utils/prisma.js";
import { Role } from "@prisma/client";

/**
 * Handles `employee.created` events published by hr-service.
 *
 * Unlike stock-service's local Employee table (which requires a unique
 * email hr-service doesn't send), transport-service's Employee.email is
 * OPTIONAL (see prisma/schema/employee.prisma), so this can safely upsert.
 *
 * ⚠️ Role enum mismatch: hr-service has "IRRIGATER" (typo, see
 * hr-service/prisma/schema/schema.prisma), transport-service has
 * "IRRIGATOR" (correct spelling). Every other role value matches. If an
 * employee with that specific role is synced, the cast below falls back to
 * MEMBER rather than crashing — fix the spelling on one side to close this.
 */
function mapRole(role: string): Role {
  if (role in Role) return role as Role;
  return Role.MEMBER;
}

export async function employeeCreatedHandler(payload: EmployeeCreatedPayload): Promise<void> {
  const role = mapRole(payload.role);

  await prisma.employee.upsert({
    where: { id: payload.employeeId },
    create: {
      id: payload.employeeId,
      farmId: payload.farmId,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role,
      email: payload.email ?? null,
    },
    update: {
      farmId: payload.farmId,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role,
      ...(payload.email !== undefined ? { email: payload.email } : {}),
    },
  });

  kafkaLogger.info("employee.created handled", {
    employeeId: payload.employeeId,
    farmId: payload.farmId,
  });
}
