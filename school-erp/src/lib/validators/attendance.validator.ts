import { z } from "zod";

const attendanceStatusEnum = z.enum(["PRESENT", "ABSENT", "LEAVE", "LATE"]);

export const markAttendanceEntrySchema = z.object({
  studentId: z.string().uuid(),
  status: attendanceStatusEnum,
  remarks: z.string().optional(),
});

/** Bulk daily (or subject-wise) attendance marking for an entire section in one request. */
export const bulkMarkAttendanceSchema = z.object({
  classId: z.string().uuid(),
  sectionId: z.string().uuid(),
  subjectId: z.string().uuid().optional(), // omit for whole-day attendance
  date: z.coerce.date(),
  entries: z.array(markAttendanceEntrySchema).min(1, "At least one student entry is required"),
});

export const updateAttendanceSchema = z.object({
  status: attendanceStatusEnum,
  remarks: z.string().optional(),
});

export const attendanceQuerySchema = z.object({
  classId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
  date: z.coerce.date().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(200).default(31),
});

export const attendanceReportQuerySchema = z.object({
  classId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2000).max(2100),
});

export const updateAttendanceRuleSchema = z.object({
  name: z.string().min(1).optional(),
  minimumAttendancePercentage: z.coerce.number().min(0).max(100),
  isActive: z.boolean().default(true),
});

export type BulkMarkAttendanceInput = z.infer<typeof bulkMarkAttendanceSchema>;
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;
