import { z } from "zod";
import { toUTCDateOnly } from "../utils/dateCalculations";
import includeOptionsSchema from "./includeOptionsSchemas";
import paginationSchema from "./paginationSchemas";

/**
 * Maximum file size for uploads (10MB in bytes)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Allowed file extensions for delivery proof uploads
 */
export const ALLOWED_FILE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".pdf"];

/**
 * Zod schema for base DeliveryProof shape.
 */
export const deliveryProofSchema = z.object({
  id: z.string().uuid(),
  recipientName: z
    .string()
    .min(2, "Recipient name must be at least 2 characters")
    .max(100, "Recipient name must not exceed 100 characters")
    .trim(),
  receivedAt: z.coerce.date({ required_error: "Received date is required" }),
  signature: z.string().url("Signature must be a valid URL").nullable().optional(),
  proofUrl: z.string().url("Proof URL must be a valid URL").nullable().optional(),
  isValid: z.boolean().default(true),
  rejectionReason: z
    .string()
    .min(10, "Rejection reason must be at least 10 characters")
    .max(500, "Rejection reason must not exceed 500 characters")
    .trim()
    .nullable()
    .optional(),
  shipmentId: z.string().uuid("Invalid shipment ID format"),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/**
 * Zod schema for creating a new DeliveryProof.
 */
export const createDeliveryProofSchema = deliveryProofSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isValid: true,
  rejectionReason: true,
});

/**
 * Zod schema for updating DeliveryProof (invalidation).
 * Validates business logic: rejectionReason is required when isValid is false.
 */
export const updateDeliveryProofSchema = deliveryProofSchema
  .pick({
    recipientName: true,
    signature: true,
    isValid: true,
    rejectionReason: true,
  })
  .partial()
  .refine(
    (data) => {
      // If isValid is explicitly set to false, rejectionReason must be provided
      if (data.isValid === false && !data.rejectionReason) {
        return false;
      }
      return true;
    },
    {
      message: "Rejection reason is required when marking proof as invalid",
      path: ["rejectionReason"],
    }
  );

/**
 * Zod schema for presigned URL request with file validation.
 */
export const presignedUploadSchema = z.object({
  fileName: z
    .string()
    .min(1, "File name is required")
    .max(255, "File name must not exceed 255 characters")
    .refine(
      (fileName) => {
        const ext = fileName.toLowerCase().substring(fileName.lastIndexOf("."));
        return ALLOWED_FILE_EXTENSIONS.includes(ext);
      },
      {
        message: `File must have one of the following extensions: ${ALLOWED_FILE_EXTENSIONS.join(", ")}`,
      }
    ),
  fileType: z.enum(["image/jpeg", "image/png", "image/jpg", "application/pdf"], {
    errorMap: () => ({ message: "File type must be image (jpeg/png) or PDF" }),
  }),
  fileSize: z
    .number()
    .positive("File size must be positive")
    .max(MAX_FILE_SIZE, `File size must not exceed ${MAX_FILE_SIZE / 1024 / 1024}MB`)
    .optional(),
  shipmentId: z.string().uuid("Invalid shipment ID"),
});

// Input validation for getProof by ID
export const DeliveryProofsIdParamsSchema = z.object({
  id: z.string().uuid({ message: "Invalid ID format" }),
});

export const deliveryProofsFilterQuerySchema = deliveryProofSchema
  .pick({
    isValid: true,
    shipmentId: true,
  })
  .partial()
  .extend({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .merge(paginationSchema)
  .merge(includeOptionsSchema)
  .refine((data) => (!data.startDate && !data.endDate) || (data.startDate && data.endDate), {
    message: "Both startDate and endDate must be provided together",
    path: ["startDate"],
  })
  .transform((data) => {
    if (data.startDate && data.endDate) {
      const startDate = toUTCDateOnly(data.startDate);
      const endDate = toUTCDateOnly(data.endDate);

      if (startDate > endDate) {
        throw new z.ZodError([
          {
            path: ["startDate"],
            message: "startDate must be before endDate",
            code: z.ZodIssueCode.custom,
          },
        ]);
      }

      return {
        ...data,
        startDate,
        endDate,
      };
    }
    return data;
  });

export type CreateDeliveryProofInput = z.infer<typeof createDeliveryProofSchema>;
export type UpdateDeliveryProofInput = z.infer<typeof updateDeliveryProofSchema>;
export type PresignedUploadInput = z.infer<typeof presignedUploadSchema>;
export type DeliveryProofsIdParamsInput = z.infer<typeof DeliveryProofsIdParamsSchema>;
export type DeliveryProofsFilterQueryInput = z.infer<typeof deliveryProofsFilterQuerySchema>;
