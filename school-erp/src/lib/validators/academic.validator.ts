import { z } from "zod";

export const createAcademicYearSchema = z.object({
  name: z.string().min(1, "Name is required, e.g. 2025-2026"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isCurrent: z.boolean().default(false),
}).refine((d) => d.endDate > d.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
});

export const updateAcademicYearSchema = z.object({
  name: z.string().min(1).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  isCurrent: z.boolean().optional(),
});

export const createClassSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  numericGrade: z.coerce.number().min(0).max(20),
  academicYearId: z.string().uuid("Select an academic year"),
});

export const updateClassSchema = createClassSchema.partial();

export const createSectionSchema = z.object({
  name: z.string().min(1, "Section name is required").max(10),
  classId: z.string().uuid("Select a class"),
  capacity: z.coerce.number().min(1).max(200).default(40),
  classTeacherId: z.string().uuid().optional(),
});

export const updateSectionSchema = z.object({
  name: z.string().min(1).max(10).optional(),
  capacity: z.coerce.number().min(1).max(200).optional(),
  classTeacherId: z.string().uuid().optional().nullable(),
});

export const enrollStudentSchema = z.object({
  studentId: z.string().uuid(),
  sectionId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  rollNumber: z.string().optional(),
});

export type CreateAcademicYearInput = z.infer<typeof createAcademicYearSchema>;
export type CreateClassInput = z.infer<typeof createClassSchema>;
export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type EnrollStudentInput = z.infer<typeof enrollStudentSchema>;
