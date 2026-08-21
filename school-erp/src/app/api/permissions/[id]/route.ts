import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("permissions.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const existing = await prisma.permission.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Permission not found");

  const permission = await prisma.permission.update({
    where: { id: params.id },
    data: { description: body.description },
  });

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "Permission", entityId: permission.id, newValues: body, ipAddress, userAgent });

  return success(permission);
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("permissions.delete");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.permission.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Permission not found");

  await prisma.permission.update({ where: { id: params.id }, data: { deletedAt: new Date() } });

  await logAudit({ userId: guard.payload!.sub, action: "DELETE", entityType: "Permission", entityId: params.id, oldValues: { name: existing.name }, ipAddress, userAgent });

  return success(null, "Permission deleted successfully");
}
