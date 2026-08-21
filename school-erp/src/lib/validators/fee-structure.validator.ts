import { z } from "zod";

export const createFeeStructureSchema = z.object({
  classId: z.string().uuid("Select a class"),
  academicYearId: z.string().uuid("Select an academic year"),
  feeCategoryId: z.string().uuid("Select a fee category"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  dueDate: z.coerce.date(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const updateFeeStructureSchema = z.object({
  amount: z.coerce.number().min(0.01).optional(),
  dueDate: z.coerce.date().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const feeStructureQuerySchema = z.object({
  classId: z.string().uuid().optional(),
  academicYearId: z.string().uuid().optional(),
  feeCategoryId: z.string().uuid().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export type CreateFeeStructureInput = z.infer<typeof createFeeStructureSchema>;
