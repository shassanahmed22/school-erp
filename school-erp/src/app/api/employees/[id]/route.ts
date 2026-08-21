import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { updateEmployeeSchema } from "@/lib/validators/employee.validator";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("employees.view");
  if (guard.error) return guard.error;

  const employee = await prisma.employee.findFirst({
    where: { id: params.id, deletedAt: null },
    include: {
      department: true,
      designation: true,
      documents: { orderBy: { uploadedAt: "desc" } },
    },
  });
  if (!employee) return notFound("Employee not found");

  return success(employee);
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("employees.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateEmployeeSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.employee.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Employee not found");

  const employee = await prisma.employee.update({ where: { id: params.id }, data: parsed.data });

  await logAudit({
    userId: guard.payload!.sub,
    action: "UPDATE",
    entityType: "Employee",
    entityId: employee.id,
    oldValues: { status: existing.status },
    newValues: parsed.data,
    ipAddress,
    userAgent,
  });
  await logActivity({ userId: guard.payload!.sub, type: "SYSTEM", description: `Updated employee: ${employee.firstName} ${employee.lastName}` });

  return success({ id: employee.id });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("employees.delete");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.employee.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Employee not found");

  await prisma.employee.update({ where: { id: params.id }, data: { deletedAt: new Date() } });

  await logAudit({ userId: guard.payload!.sub, action: "DELETE", entityType: "Employee", entityId: params.id, oldValues: { employeeCode: existing.employeeCode }, ipAddress, userAgent });
  await logActivity({ userId: guard.payload!.sub, type: "SYSTEM", description: `Removed employee: ${existing.firstName} ${existing.lastName}` });

  return success(null, "Employee removed successfully");
}
