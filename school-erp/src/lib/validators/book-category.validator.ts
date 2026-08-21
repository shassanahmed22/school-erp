import { z } from "zod";

export const createBookCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100),
  description: z.string().optional(),
});

export const updateBookCategorySchema = createBookCategorySchema.partial();

export type CreateBookCategoryInput = z.infer<typeof createBookCategorySchema>;
