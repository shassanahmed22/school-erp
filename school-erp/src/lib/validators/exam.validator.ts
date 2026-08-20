import { z } from "zod";

const examTypeEnum = z.enum(["QUIZ", "MID_TERM", "FINAL_TERM", "MONTHLY_TEST", "ASSIGNMENT", "OTHER"]);
const examStatusEnum = z.enum(["DRAFT", "SCHEDULED", "ONGOING", "COMPLETED", "RESULT_PUBLISHED", "CANCELLED"]);

export const examSubjectInputSchema = z.object({
  subjectId: z.string().uuid(),
  totalMarks: z.coerce.number().min(1).default(100),
  passingMarks: z.coerce.number().min(0).default(40),
}).refine((d) => d.passingMarks <= d.totalMarks, {
  message: "Passing marks cannot exceed total marks",
  path: ["passingMarks"],
});

export const createExamSchema = z.object({
  name: z.string().min(1, "Exam name is required"),
  type: examTypeEnum,
  academicYearId: z.string().uuid(),
  classId: z.string().uuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: examStatusEnum.default("DRAFT"),
  subjects: z.array(examSubjectInputSchema).min(1, "Add at least one subject"),
}).refine((d) => d.endDate >= d.startDate, {
  message: "End date must be on or after the start date",
  path: ["endDate"],
});

export const updateExamSchema = z.object({
  name: z.string().min(1).optional(),
  type: examTypeEnum.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: examStatusEnum.optional(),
});

export const examQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  academicYearId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  status: examStatusEnum.optional(),
});

export const createExamScheduleSchema = z.object({
  examSubjectId: z.string().uuid(),
  examDate: z.coerce.date(),
  startTime: z.string().min(1, "Start time is required"), // "HH:mm"
  endTime: z.string().min(1, "End time is required"),
  room: z.string().optional(),
}).refine((d) => d.endTime > d.startTime, {
  message: "End time must be after start time",
  path: ["endTime"],
});

export const updateExamScheduleSchema = z.object({
  examDate: z.coerce.date().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  room: z.string().optional(),
});

export type CreateExamInput = z.infer<typeof createExamSchema>;
export type UpdateExamInput = z.infer<typeof updateExamSchema>;
export type CreateExamScheduleInput = z.infer<typeof createExamScheduleSchema>;
