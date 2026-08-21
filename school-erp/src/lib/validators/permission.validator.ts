import { z } from "zod";

export const createPermissionSchema = z.object({
  module: z.string().min(1, "Module is required").max(50),
  action: z.string().min(1, "Action is required").max(50),
  description: z.string().optional(),
});

export const assignPermissionSchema = z.object({
  roleId: z.string().uuid(),
  permissionIds: z.array(z.string().uuid()),
});

export type CreatePermissionInput = z.infer<typeof createPermissionSchema>;
