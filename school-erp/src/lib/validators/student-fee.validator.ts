import { z } from "zod";

export const assignStudentFeeSchema = z.object({
  studentId: z.string().uuid(),
  feeStructureId: z.string().uuid(),
  discount: z.coerce.number().min(0).default(0),
});

export const bulkAssignFeeSchema = z.object({
  feeStructureId: z.string().uuid(),
  sectionId: z.string().uuid().optional(), // omit to assign to the whole class
  classId: z.string().uuid(),
  applyScholarships: z.boolean().default(true),
});

export const updateStudentFeeSchema = z.object({
  discount: z.coerce.number().min(0).optional(),
  dueDate: z.coerce.date().optional(),
  status: z.enum(["PENDING", "PARTIALLY_PAID", "PAID", "OVERDUE", "WAIVED"]).optional(),
});

export const studentFeeQuerySchema = z.object({
  studentId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
  feeStructureId: z.string().uuid().optional(),
  status: z.enum(["PENDING", "PARTIALLY_PAID", "PAID", "OVERDUE", "WAIVED"]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(200).default(20),
});

export type AssignStudentFeeInput = z.infer<typeof assignStudentFeeSchema>;
export type BulkAssignFeeInput = z.infer<typeof bulkAssignFeeSchema>;
