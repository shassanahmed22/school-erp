import { z } from "zod";

export const createInventoryCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
});

export const updateInventoryCategorySchema = createInventoryCategorySchema.partial();

export type CreateInventoryCategoryInput = z.infer<typeof createInventoryCategorySchema>;
