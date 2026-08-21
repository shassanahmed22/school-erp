import { z } from "zod";

export const createDesignationSchema = z.object({
  departmentId: z.string().uuid("Select a department"),
  title: z.string().min(1, "Designation title is required").max(100),
  description: z.string().optional(),
});

export const updateDesignationSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
});

export type CreateDesignationInput = z.infer<typeof createDesignationSchema>;
