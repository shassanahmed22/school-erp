import { z } from "zod";

export const createBookSchema = z.object({
  categoryId: z.string().uuid("Select a category"),
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author is required"),
  isbn: z.string().optional(),
  publisher: z.string().optional(),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1").default(1),
  shelfLocation: z.string().optional(),
});

export const updateBookSchema = z.object({
  categoryId: z.string().uuid().optional(),
  title: z.string().min(1).optional(),
  author: z.string().min(1).optional(),
  isbn: z.string().optional(),
  publisher: z.string().optional(),
  quantity: z.coerce.number().min(1).optional(),
  shelfLocation: z.string().optional(),
});

export const bookQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(12),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  availableOnly: z.coerce.boolean().optional(),
});

export type CreateBookInput = z.infer<typeof createBookSchema>;
export type UpdateBookInput = z.infer<typeof updateBookSchema>;
