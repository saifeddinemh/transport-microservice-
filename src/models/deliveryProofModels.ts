import type { DeliveryProof, Shipment } from "@prisma/client";
import { format } from "date-fns";
import type { ShipmentModel } from "./shipmentModels";
import { mapPrismaShipmentToModel } from "./shipmentModels";

/**
 * TypeScript model representing the DeliveryProof entity in the API.
 */
export interface DeliveryProofModel {
  id: string;
  recipientName: string;
  receivedAt: string;
  signature?: string | null;
  proofUrl?: string | null;
  isValid: boolean;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  shipmentId: string;
  shipment?: ShipmentModel | null;
}

/**
 * Converts a Prisma `DeliveryProof` type into an API-safe `DeliveryProofModel`.
 * @param deliveryProof Prisma DeliveryProof object
 * @returns API-safe DeliveryProofModel
 */
export const mapPrismaDeliveryProofToModel = (
  deliveryProof: DeliveryProof
): DeliveryProofModel => ({
  id: deliveryProof.id,
  recipientName: deliveryProof.recipientName,
  receivedAt: format(deliveryProof.receivedAt, "dd-MM-yyyy HH:mm"),
  signature: deliveryProof.signature ?? null,
  proofUrl: deliveryProof.proofUrl ?? null,
  isValid: deliveryProof.isValid ?? true,
  rejectionReason: deliveryProof.rejectionReason ?? null,
  createdAt: format(deliveryProof.createdAt, "dd-MM-yyyy HH:mm"),
  updatedAt: format(deliveryProof.updatedAt, "dd-MM-yyyy HH:mm"),
  shipmentId: deliveryProof.shipmentId,
});

/**
 * Converts a Prisma `DeliveryProof` type into an API-safe `DeliveryProofModel` with nested shipment.
 * @param proof Prisma DeliveryProof object with optional shipment relation
 * @returns API-safe DeliveryProofModel
 */
export const mapNestedPrismaDeliveryProofToModel = (
  proof: DeliveryProof & { shipment?: Shipment | null }
): DeliveryProofModel => ({
  id: proof.id,
  recipientName: proof.recipientName,
  receivedAt: format(proof.receivedAt, "dd-MM-yyyy HH:mm"),
  signature: proof.signature ?? null,
  proofUrl: proof.proofUrl ?? null,
  isValid: proof.isValid ?? true,
  rejectionReason: proof.rejectionReason ?? null,
  createdAt: format(proof.createdAt, "dd-MM-yyyy HH:mm"),
  updatedAt: format(proof.updatedAt, "dd-MM-yyyy HH:mm"),
  shipmentId: proof.shipmentId,
  shipment: proof.shipment ? mapPrismaShipmentToModel(proof.shipment) : null,
});

/**
 * Presigned URL response type for file uploads.
 */
export interface PresignedUrlResponse {
  uploadUrl: string;
  fileKey: string;
  expiresIn: number;
}
