import type { PresignedUrlResponse } from "../models/deliveryProofModels";
import { ServerErrors } from "./serverErrors";

/**
 * Generate a mock presigned URL for file upload.
 *
 * This is a mock implementation that returns a fake presigned URL using bidsys.ma domain.
 *
 * @param fileName - Original file name
 * @param fileType - MIME type of the file (e.g., 'image/jpeg', 'application/pdf')
 * @param shipmentId - ID of the shipment this proof belongs to
 * @returns Mock presigned URL response with upload URL, file key, and expiration time
 */
export const generatePresignedUrl = async (
  fileName: string,
  fileType: string,
  shipmentId: string
): Promise<PresignedUrlResponse> => {
  try {
    // Generate unique file key with timestamp to prevent collisions
    const timestamp = Date.now();
    const fileKey = `delivery-proofs/${shipmentId}/${timestamp}-${fileName}`;
    // Mock upload URL using bidsys.ma domain
    const mockUploadUrl = `https://storage.bidsys.ma/${fileKey}`;

    return {
      uploadUrl: mockUploadUrl,
      fileKey: fileKey,
      expiresIn: 3600 * 24, // 1 day expiration
    };
  } catch (error) {
    throw new ServerErrors("Failed to generate presigned URL", 500, error);
  }
};
