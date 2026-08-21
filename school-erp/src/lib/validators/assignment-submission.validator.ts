import { z } from "zod";

export const submitAssignmentSchema = z.object({
  content: z.string().optional(),
  attachmentUrl: z.string().url().optional().or(z.literal("")),
}).refine((data) => !!data.content || !!data.attachmentUrl, {
  message: "Please provide either a written answer or an attachment",
  path: ["content"],
});

export const gradeSubmissionSchema = z.object({
  marksObtained: z.coerce.number().int().min(0, "Marks cannot be negative"),
  feedback: z.string().optional(),
});

export type SubmitAssignmentInput = z.infer<typeof submitAssignmentSchema>;
export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;
