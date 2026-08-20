import { z } from "zod";

const driverStatusEnum = z.enum(["ACTIVE", "ON_LEAVE", "INACTIVE"]);

export const createDriverSchema = z.object({
  name: z.string().min(1, "Driver name is required"),
  phone: z.string().min(7, "Enter a valid phone number"),
  licenseNumber: z.string().min(1, "License number is required"),
  status: driverStatusEnum.default("ACTIVE"),
});

export const updateDriverSchema = createDriverSchema.partial();

export type CreateDriverInput = z.infer<typeof createDriverSchema>;
