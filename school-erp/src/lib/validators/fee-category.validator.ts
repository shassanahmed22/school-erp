import { z } from "zod";

export const createFeeCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const updateFeeCategorySchema = createFeeCategorySchema.partial();

export type CreateFeeCategoryInput = z.infer<typeof createFeeCategorySchema>;
