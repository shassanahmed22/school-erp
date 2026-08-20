import { z } from "zod";

export const subjectMarkEntrySchema = z.object({
  studentId: z.string().uuid(),
  obtainedMarks: z.coerce.number().min(0),
  isAbsent: z.boolean().default(false),
});

/** Bulk marks entry for one exam-subject across an entire class/section roster. */
export const bulkEnterMarksSchema = z.object({
  examId: z.string().uuid(),
  examSubjectId: z.string().uuid(),
  entries: z.array(subjectMarkEntrySchema).min(1, "At least one student entry is required"),
});

export const resultQuerySchema = z.object({
  examId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(200).default(50),
});

export type BulkEnterMarksInput = z.infer<typeof bulkEnterMarksSchema>;
