import { z } from "zod";
import { Role, Status } from "@prisma/client";
import paginationSchema from "./paginationSchemas";

export const employeeSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email("Invalid Email Address").optional().nullable(),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  telephone: z.string().min(8),
  role: z.nativeEnum(Role),
  transport: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  farmId: z.string().uuid(),
  status: z.nativeEnum(Status),
});

// Filter schema for querying employees (with pagination)
export const filterEmployeeSchema = employeeSchema
  .pick({
    status: true,
    farmId: true,
    role: true,
  })
  .partial()
  .merge(paginationSchema);

// Schema for creating an employee
export const createEmployeeSchema = employeeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type inference for the schemas
export type createEmployeeBody = z.infer<typeof createEmployeeSchema>;
export type filterEmployeeInput = z.infer<typeof filterEmployeeSchema>;
