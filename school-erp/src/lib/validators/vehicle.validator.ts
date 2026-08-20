import { z } from "zod";

const vehicleStatusEnum = z.enum(["ACTIVE", "MAINTENANCE", "INACTIVE"]);

export const createVehicleSchema = z.object({
  vehicleNumber: z.string().min(1, "Vehicle number is required"),
  model: z.string().optional(),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1"),
  status: vehicleStatusEnum.default("ACTIVE"),
});

export const updateVehicleSchema = createVehicleSchema.partial();

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
