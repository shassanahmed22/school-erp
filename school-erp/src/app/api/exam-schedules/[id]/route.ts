import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { updateExamScheduleSchema } from "@/lib/validators/exam.validator";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("exams.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateExamScheduleSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.examSchedule.findUnique({ where: { id: params.id } });
  if (!existing) return notFound("Exam schedule not found");

  const schedule = await prisma.examSchedule.update({ where: { id: params.id }, data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "ExamSchedule", entityId: schedule.id, newValues: parsed.data, ipAddress, userAgent });

  return success(schedule);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("exams.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.examSchedule.findUnique({ where: { id: params.id } });
  if (!existing) return notFound("Exam schedule not found");

  await prisma.examSchedule.delete({ where: { id: params.id } });
  await logAudit({ userId: guard.payload!.sub, action: "DELETE", entityType: "ExamSchedule", entityId: params.id, ipAddress, userAgent });

  return success(null, "Schedule removed");
}
