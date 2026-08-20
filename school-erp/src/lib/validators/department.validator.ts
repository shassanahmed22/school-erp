import { z } from "zod";

export const createDepartmentSchema = z.object({
  name: z.string().min(1, "Department name is required").max(100),
  description: z.string().optional(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
