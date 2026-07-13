import { z } from "zod";

// Pagination schema
const paginationSchema = z.object({
  page: z.coerce
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val > 0, { message: "Page must be greater than 0" }),

  limit: z.coerce
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine((val) => val > 0 && val <= 100, {
      message: "Limit must be between 1 and 100",
    }),
});

export default paginationSchema;
