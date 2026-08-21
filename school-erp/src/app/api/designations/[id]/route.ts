import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { updateDesignationSchema } from "@/lib/validators/designation.validator";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("departments.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateDesignationSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.designation.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Designation not found");

  const designation = await prisma.designation.update({ where: { id: params.id }, data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "Designation", entityId: designation.id, newValues: parsed.data, ipAddress, userAgent });

  return success(designation);
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("departments.delete");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.designation.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Designation not found");

  const inUse = await prisma.employee.count({ where: { designationId: params.id, deletedAt: null } });
  if (inUse > 0) return failure("Cannot delete a designation that has employees assigned", 409);

  await prisma.designation.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  await logAudit({ userId: guard.payload!.sub, action: "DELETE", entityType: "Designation", entityId: params.id, ipAddress, userAgent });

  return success(null, "Designation deleted successfully");
}
