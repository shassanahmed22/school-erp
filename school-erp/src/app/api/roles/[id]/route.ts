import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { updateRoleSchema } from "@/lib/validators/role.validator";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("roles.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.role.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Role not found");
  if (existing.isSystem && parsed.data.name) {
    return failure("System roles cannot be renamed", 403);
  }

  const { permissionIds, ...rest } = parsed.data;

  const role = await prisma.role.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(permissionIds && {
        rolePermissions: {
          deleteMany: {},
          create: permissionIds.map((permissionId) => ({ permissionId })),
        },
      }),
    },
  });

  await logAudit({
    userId: guard.payload!.sub,
    action: "PERMISSION_CHANGE",
    entityType: "Role",
    entityId: role.id,
    newValues: parsed.data,
    ipAddress,
    userAgent,
  });
  await logActivity({ userId: guard.payload!.sub, type: "ROLE", description: `Updated role: ${role.name}` });

  return success(role);
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("roles.delete");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.role.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Role not found");
  if (existing.isSystem) return failure("System roles cannot be deleted", 403);

  await prisma.role.update({ where: { id: params.id }, data: { deletedAt: new Date() } });

  await logAudit({ userId: guard.payload!.sub, action: "DELETE", entityType: "Role", entityId: params.id, oldValues: { name: existing.name }, ipAddress, userAgent });
  await logActivity({ userId: guard.payload!.sub, type: "ROLE", description: `Deleted role: ${existing.name}` });

  return success(null, "Role deleted successfully");
}
