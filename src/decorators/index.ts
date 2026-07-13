import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import authenticate from "./authenticate";
import checkRole from "./checkRole";
import generateAccessToken from "./generateAccessToken";
import generateRefreshToken from "./generateRefreshToken";
import verifyRefreshToken from "./verifyRefreshToken";
import verifyFarmOwnership from "./verifyFarmOwnership";
import verifyVehicleOwnership from "./verifyVehicleOwnership";
import verifyDriverOwnership from "./verifyDriverOwnership";
import verifyShipmentOwnership from "./verifyShipmentOwnership";
import verifyTransporterOwnership from "./verifyTransporterOwnership";
import verifyContractOwnership from "./verifyContractOwnership";
import verifyTransportRequestOwnership from "./verifyTransportRequestOwnership";
import verifyFuelLogOwnership from "./verifyFuelLogOwnership";
import verifyMaintenanceLogOwnership from "./verifyMaintenanceLogOwnership";
import verifyDeliveryProofOwnership from "./verifyDeliveryProofOwnership";
import fp from "fastify-plugin";

const appDecorators: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.decorate("authenticate", authenticate);
  fastify.decorate("checkRole", checkRole);
  fastify.decorate("generateAccessToken", generateAccessToken);
  fastify.decorate("generateRefreshToken", generateRefreshToken);
  fastify.decorate("verifyRefreshToken", verifyRefreshToken);
  fastify.decorate("verifyFarmOwnership", verifyFarmOwnership);
  fastify.decorate("verifyVehicleOwnership", verifyVehicleOwnership);
  fastify.decorate("verifyDriverOwnership", verifyDriverOwnership);
  fastify.decorate("verifyShipmentOwnership", verifyShipmentOwnership);
  fastify.decorate("verifyTransporterOwnership", verifyTransporterOwnership);
  fastify.decorate("verifyContractOwnership", verifyContractOwnership);
  fastify.decorate("verifyTransportRequestOwnership", verifyTransportRequestOwnership);
  fastify.decorate("verifyFuelLogOwnership", verifyFuelLogOwnership);
  fastify.decorate("verifyMaintenanceLogOwnership", verifyMaintenanceLogOwnership);
  fastify.decorate("verifyDeliveryProofOwnership", verifyDeliveryProofOwnership);
};

export default fp(appDecorators);
