import "fastify";
import type { JwtPayload } from "./JwtPayload";
import type { VehicleModel } from "../models/vehicleModels";
import type { DriverModel } from "../models/driverModels";
import type { ShipmentModel } from "../models/shipmentModels";
import type { TransporterModel } from "../models/transporterModels";
import type { TransportationContractModel } from "../models/transportationContractModels";
import type { TransportRequestModel } from "../models/transportRequestModels";
import type { FuelLogModel } from "../models/fuelLogModels";
import type { MaintenanceLogModel } from "../models/maintenanceLogModels";
import type { DeliveryProofModel } from "../models/deliveryProofModels";

declare module "fastify" {
  interface FastifyRequest {
    owner?: JwtPayload;
    employee?: EmployeeModel;
    farmId?: string;
    vehicle?: VehicleModel;
    driver?: DriverModel;
    shipment?: ShipmentModel;
    transporter?: TransporterModel;
    contract?: TransportationContractModel;
    transportRequest?: TransportRequestModel;
    fuelLog?: FuelLogModel;
    maintenanceLog?: MaintenanceLogModel;
    deliveryProof?: DeliveryProofModel;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    checkRole: (
      ...roles: string[]
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    generateAccessToken: (payload: JwtPayload) => string;
    generateRefreshToken: (payload: JwtPayload) => string;
    verifyRefreshToken: (token: string) => JwtPayload;

    verifyFarmOwnership(
      request: FastifyRequest<{
        Params?: { id?: string; farmId?: string; transporterId?: string };
        Body?: createEmployeeBody;
        Querystring?: filterEmployeeInput;
      }>,
      reply: FastifyReply
    ): Promise<void>;
    verifyVehicleOwnership(
      request: FastifyRequest<{
        Params?: VehiclesIdParamsInput;
        Querystring?: VehiclesFilterQueryInput;
      }>,
      reply: FastifyReply
    ): Promise<void>;
    verifyDriverOwnership(
      request: FastifyRequest<{
        Params?: DriverIdParamsInput;
      }>,
      reply: FastifyReply
    ): Promise<void>;
    verifyShipmentOwnership(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    verifyTransporterOwnership: (
      request: FastifyRequest<{
        Params?: TransportersIdParamsInput & { transporterId?: string };
      }>,
      reply: FastifyReply
    ) => Promise<void>;

    verifyContractOwnership: (
      request: FastifyRequest<{ Params: ContractsIdParamsInput }>,
      reply: FastifyReply
    ) => Promise<void>;

    verifyTransportRequestOwnership: (
      request: FastifyRequest<{ Params: TransportRequestsIdParamsInput }>,
      reply: FastifyReply
    ) => Promise<void>;

    verifyFuelLogOwnership: (
      request: FastifyRequest<{ Params: FuelLogsIdParamsInput }>,
      reply: FastifyReply
    ) => Promise<void>;

    verifyMaintenanceLogOwnership: (
      request: FastifyRequest<{ Params: MaintenanceLogsIdParamsInput }>,
      reply: FastifyReply
    ) => Promise<void>;

    verifyDeliveryProofOwnership: (
      request: FastifyRequest<{ Params: DeliveryProofsIdParamsInput }>,
      reply: FastifyReply
    ) => Promise<void>;
  }
}
