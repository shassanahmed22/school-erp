import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { updateSubjectSchema } from "@/lib/validators/subject.validator";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("subjects.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateSubjectSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.subject.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Subject not found");

  const subject = await prisma.subject.update({ where: { id: params.id }, data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "Subject", entityId: subject.id, newValues: parsed.data, ipAddress, userAgent });

  return success(subject);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("subjects.delete");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.subject.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Subject not found");

  await prisma.subject.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  await logAudit({ userId: guard.payload!.sub, action: "DELETE", entityType: "Subject", entityId: params.id, ipAddress, userAgent });

  return success(null, "Subject deleted successfully");
}
