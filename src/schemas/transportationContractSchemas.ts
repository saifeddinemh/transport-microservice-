import { z } from "zod";
import { ContractType, EntityStatus } from "@prisma/client";
import { toUTCDateOnly } from "../utils/dateCalculations";
import includeOptionsSchema from "./includeOptionsSchemas";
import paginationSchema from "./paginationSchemas";

/**
 * Zod schema for TransportationContract entity validation.
 */
export const contractSchema = z.object({
  id: z.string().uuid(),
  startDate: z.coerce.date({ required_error: "Start date is required" }),
  endDate: z.coerce.date().optional().nullable(),
  contractType: z.nativeEnum(ContractType),
  pricePerKm: z.number().positive("Price per km must be positive"),
  maxWeight: z.number().positive("Max weight must be positive"),
  status: z.nativeEnum(EntityStatus).default("ACTIVE"),
  serviceType: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  isArchived: z.boolean().default(false),
  transportId: z.string().uuid("Invalid transport ID"),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/**
 * Zod schema for creating a new TransportationContract.
 */
export const createContractSchema = contractSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    isArchived: true,
  })
  .refine(
    (data) => {
      if (data.endDate && data.startDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: "End date must be equal to or after start date",
      path: ["endDate"],
    }
  )
  .transform((data) => {
    return {
      ...data,
      startDate: toUTCDateOnly(data.startDate),
      endDate: data.endDate ? toUTCDateOnly(data.endDate) : null,
    };
  });

/**
 * Zod schema for updating an existing TransportationContract.
 */
export const updateContractSchema = contractSchema
  .pick({
    startDate: true,
    endDate: true,
    contractType: true,
    pricePerKm: true,
    maxWeight: true,
    status: true,
    serviceType: true,
    terms: true,
    transportId: true,
  })
  .partial()
  .refine(
    (data) => {
      if (data.endDate && data.startDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: "End date must be equal to or after start date",
      path: ["endDate"],
    }
  )
  .transform((data) => {
    return {
      ...data,
      startDate: data.startDate ? toUTCDateOnly(data.startDate) : undefined,
      endDate: data.endDate ? toUTCDateOnly(data.endDate) : undefined,
    };
  });

// Input validation for getContract by ID
export const ContractsIdParamsSchema = z.object({
  id: z.string().uuid({ message: "Invalid ID format" }),
});

/**
 * Zod schema for filtering contracts
 */
export const contractsFilterQuerySchema = contractSchema
  .pick({
    status: true,
    contractType: true,
    transportId: true,
  })
  .partial()
  .extend({
    farmId: z.string().uuid({ message: "Invalid farm ID format" }).optional(),
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

// Type inference for the schemas
export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
export type ContractsIdParamsInput = z.infer<typeof ContractsIdParamsSchema>;
export type ContractsFilterQueryInput = z.infer<typeof contractsFilterQuerySchema>;
