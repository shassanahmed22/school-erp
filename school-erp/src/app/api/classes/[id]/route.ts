import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { updateClassSchema } from "@/lib/validators/academic.validator";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("classes.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateClassSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.class.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Class not found");

  const cls = await prisma.class.update({ where: { id: params.id }, data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "Class", entityId: cls.id, newValues: parsed.data, ipAddress, userAgent });

  return success(cls);
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("classes.delete");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.class.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Class not found");

  const activeEnrollments = await prisma.studentEnrollment.count({
    where: { section: { classId: params.id }, status: "ACTIVE" },
  });
  if (activeEnrollments > 0) {
    return failure("Cannot delete a class with actively enrolled students", 409);
  }

  await prisma.class.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  await logAudit({ userId: guard.payload!.sub, action: "DELETE", entityType: "Class", entityId: params.id, ipAddress, userAgent });

  return success(null, "Class deleted successfully");
}
