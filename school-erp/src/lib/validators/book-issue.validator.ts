import { z } from "zod";

export const issueBookSchema = z.object({
  bookId: z.string().uuid(),
  studentId: z.string().uuid(),
  dueDate: z.coerce.date(),
});

export const returnBookSchema = z.object({
  returnDate: z.coerce.date().default(() => new Date()),
  remarks: z.string().optional(),
});

export const bookIssueQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(15),
  studentId: z.string().uuid().optional(),
  bookId: z.string().uuid().optional(),
  status: z.enum(["ISSUED", "RETURNED", "OVERDUE", "LOST"]).optional(),
  search: z.string().optional(),
});

export type IssueBookInput = z.infer<typeof issueBookSchema>;
export type ReturnBookInput = z.infer<typeof returnBookSchema>;
