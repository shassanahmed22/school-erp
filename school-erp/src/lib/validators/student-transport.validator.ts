import { z } from "zod";

export const assignTransportSchema = z.object({
  studentId: z.string().uuid(),
  routeId: z.string().uuid(),
});

export const studentTransportQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(15),
  routeId: z.string().uuid().optional(),
  search: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export type AssignTransportInput = z.infer<typeof assignTransportSchema>;
