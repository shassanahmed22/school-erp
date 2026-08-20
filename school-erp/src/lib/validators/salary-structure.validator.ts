import { z } from "zod";

export const upsertSalaryStructureSchema = z.object({
  employeeId: z.string().uuid(),
  basicSalary: z.coerce.number().min(0, "Basic salary must be a positive number"),
  allowances: z.coerce.number().min(0).default(0),
  deductions: z.coerce.number().min(0).default(0),
});

export type UpsertSalaryStructureInput = z.infer<typeof upsertSalaryStructureSchema>;
