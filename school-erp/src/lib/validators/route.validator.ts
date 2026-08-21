import { z } from "zod";

export const createRouteSchema = z.object({
  routeName: z.string().min(1, "Route name is required"),
  startPoint: z.string().min(1, "Start point is required"),
  endPoint: z.string().min(1, "End point is required"),
  monthlyFee: z.coerce.number().min(0, "Monthly fee must be a positive number"),
  vehicleId: z.string().uuid().optional(),
  driverId: z.string().uuid().optional(),
});

export const updateRouteSchema = z.object({
  routeName: z.string().min(1).optional(),
  startPoint: z.string().min(1).optional(),
  endPoint: z.string().min(1).optional(),
  monthlyFee: z.coerce.number().min(0).optional(),
  vehicleId: z.string().uuid().optional().nullable(),
  driverId: z.string().uuid().optional().nullable(),
});

export type CreateRouteInput = z.infer<typeof createRouteSchema>;
