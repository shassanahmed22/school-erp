import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { updateExamSchema } from "@/lib/validators/exam.validator";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("exams.view");
  if (guard.error) return guard.error;

  const exam = await prisma.exam.findFirst({
    where: { id: params.id, deletedAt: null },
    include: {
      class: true,
      academicYear: true,
      examSubjects: { include: { subject: true, schedule: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!exam) return notFound("Exam not found");
  return success(exam);
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("exams.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateExamSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.exam.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Exam not found");

  const exam = await prisma.exam.update({ where: { id: params.id }, data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "Exam", entityId: exam.id, oldValues: { status: existing.status }, newValues: parsed.data, ipAddress, userAgent });
  await logActivity({ userId: guard.payload!.sub, type: "EXAM", description: `Updated exam: ${exam.name}` });

  return success(exam);
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("exams.delete");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.exam.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Exam not found");

  await prisma.exam.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  await logAudit({ userId: guard.payload!.sub, action: "DELETE", entityType: "Exam", entityId: params.id, ipAddress, userAgent });

  return success(null, "Exam deleted successfully");
}
