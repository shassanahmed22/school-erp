import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { updateDepartmentSchema } from "@/lib/validators/department.validator";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("departments.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateDepartmentSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.department.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Department not found");

  const department = await prisma.department.update({ where: { id: params.id }, data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "Department", entityId: department.id, newValues: parsed.data, ipAddress, userAgent });

  return success(department);
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("departments.delete");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.department.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Department not found");

  const inUse = await prisma.employee.count({ where: { departmentId: params.id, deletedAt: null } });
  if (inUse > 0) return failure("Cannot delete a department that has employees assigned", 409);

  await prisma.department.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  await logAudit({ userId: guard.payload!.sub, action: "DELETE", entityType: "Department", entityId: params.id, ipAddress, userAgent });

  return success(null, "Department deleted successfully");
}
