import { z } from "zod";

export const createScholarshipSchema = z.object({
  name: z.string().min(1, "Scholarship name is required"),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: z.coerce.number().min(0.01, "Value must be greater than 0"),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
}).refine((d) => d.type !== "PERCENTAGE" || d.value <= 100, {
  message: "Percentage discounts cannot exceed 100",
  path: ["value"],
});

export const updateScholarshipSchema = z.object({
  name: z.string().min(1).optional(),
  value: z.coerce.number().min(0.01).optional(),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const assignScholarshipSchema = z.object({
  studentId: z.string().uuid(),
  scholarshipId: z.string().uuid(),
});

export type CreateScholarshipInput = z.infer<typeof createScholarshipSchema>;
export type AssignScholarshipInput = z.infer<typeof assignScholarshipSchema>;
