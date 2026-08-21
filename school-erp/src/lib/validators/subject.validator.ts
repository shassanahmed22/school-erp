import { z } from "zod";

export const createSubjectSchema = z.object({
  name: z.string().min(1, "Subject name is required"),
  code: z.string().min(2, "Subject code is required").max(20).toUpperCase(),
  description: z.string().optional(),
});

export const updateSubjectSchema = createSubjectSchema.partial();

export const assignSubjectToClassSchema = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
  isElective: z.boolean().default(false),
});

export const assignTeacherToSubjectSchema = z.object({
  teacherId: z.string().uuid(),
  subjectId: z.string().uuid(),
  classSubjectId: z.string().uuid().optional(),
});

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export type AssignSubjectToClassInput = z.infer<typeof assignSubjectToClassSchema>;
export type AssignTeacherToSubjectInput = z.infer<typeof assignTeacherToSubjectSchema>;
