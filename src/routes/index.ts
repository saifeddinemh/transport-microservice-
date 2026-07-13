import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ownerRoutes } from "./ownerRoutes";
import { transporterRoutes } from "./transporterRoutes";
import { contractRoutes } from "./transportationContractRoutes";
import { transportRequestsRoutes } from "./transportRequestRoutes";
import { vehiclesRoutes } from "./vehicleRoutes";
import { deliveryProofRoutes } from "./deliveryProofRoutes";
import { maintenanceLogsRoutes } from "./maintenanceLogRoutes";
import { fuelLogsRoutes } from "./fuelLogRoutes";
import { driversRoutes } from "./driverRoutes";
import { shipmentRoutes } from "./shipmentRoutes";

export async function appRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
  await fastify.register(ownerRoutes, { prefix: "/owner" });
  await fastify.register(transporterRoutes, { prefix: "/transporters" });
  await fastify.register(contractRoutes, { prefix: "/contracts" });
  await fastify.register(transportRequestsRoutes, { prefix: "/transport-requests" });
  await fastify.register(vehiclesRoutes, { prefix: "/vehicles" });
  await fastify.register(deliveryProofRoutes, { prefix: "/delivery-proofs" });
  await fastify.register(maintenanceLogsRoutes, { prefix: "/maintenance-logs" });
  await fastify.register(fuelLogsRoutes, { prefix: "/fuelLogs" });
  await fastify.register(driversRoutes, { prefix: "/drivers" });
  await fastify.register(shipmentRoutes, { prefix: "/shipments" });
}
