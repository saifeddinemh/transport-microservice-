import { z } from "zod";

// Include options
const includeOptionsSchema = z.object({
  nested: z
    .union([z.boolean(), z.string()])
    .transform((val) => {
      if (typeof val === "boolean") return val;
      return val.toLowerCase() === "true";
    })
    .optional()
    .default(false),
});

export default includeOptionsSchema;
