import { z } from "zod";

const employeeStatusEnum = z.enum(["ACTIVE", "ON_LEAVE", "SUSPENDED", "RESIGNED", "TERMINATED"]);

export const createEmployeeSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  departmentId: z.string().uuid("Select a department"),
  designationId: z.string().uuid("Select a designation"),
  joiningDate: z.coerce.date().default(() => new Date()),
  salary: z.coerce.number().min(0, "Salary must be a positive number"),
  status: employeeStatusEnum.default("ACTIVE"),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export const employeeQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  designationId: z.string().uuid().optional(),
  status: employeeStatusEnum.optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
