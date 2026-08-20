import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { updateUserSchema } from "@/lib/validators/user.validator";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("users.view");
  if (guard.error) return guard.error;

  const user = await prisma.user.findFirst({
    where: { id: params.id, deletedAt: null },
    include: { userRoles: { include: { role: true } } },
  });
  if (!user) return notFound("User not found");

  return success({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    status: user.status,
    roles: user.userRoles.map((ur) => ({ id: ur.role.id, name: ur.role.name })),
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("users.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.user.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("User not found");

  const { roleIds, ...rest } = parsed.data;

  const user = await prisma.user.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(roleIds && {
        userRoles: {
          deleteMany: {},
          create: roleIds.map((roleId) => ({ roleId })),
        },
      }),
    },
    include: { userRoles: { include: { role: true } } },
  });

  await logAudit({
    userId: guard.payload!.sub,
    action: "UPDATE",
    entityType: "User",
    entityId: user.id,
    oldValues: { status: existing.status },
    newValues: parsed.data,
    ipAddress,
    userAgent,
  });
  await logActivity({
    userId: guard.payload!.sub,
    type: "USER",
    description: `Updated user: ${user.firstName} ${user.lastName}`,
  });

  return success({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    status: user.status,
    roles: user.userRoles.map((ur) => ur.role.name),
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("users.delete");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.user.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("User not found");

  await prisma.user.update({ where: { id: params.id }, data: { deletedAt: new Date() } });

  await logAudit({
    userId: guard.payload!.sub,
    action: "DELETE",
    entityType: "User",
    entityId: params.id,
    oldValues: { email: existing.email },
    ipAddress,
    userAgent,
  });
  await logActivity({
    userId: guard.payload!.sub,
    type: "USER",
    description: `Deleted user: ${existing.firstName} ${existing.lastName}`,
  });

  return success(null, "User deleted successfully");
}
