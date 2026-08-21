import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { createExamScheduleSchema } from "@/lib/validators/exam.validator";
import { success, created, failure } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const guard = await requirePermission("exams.view");
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const examId = searchParams.get("examId");
  if (!examId) return failure("examId is required", 400);

  const schedules = await prisma.examSchedule.findMany({
    where: { examId },
    orderBy: { examDate: "asc" },
    include: { subject: { select: { name: true, code: true } } },
  });

  return success(schedules);
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("exams.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = createExamScheduleSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const examSubject = await prisma.examSubject.findUnique({ where: { id: parsed.data.examSubjectId } });
  if (!examSubject) return failure("Exam subject not found", 404);

  const existing = await prisma.examSchedule.findUnique({ where: { examSubjectId: parsed.data.examSubjectId } });
  if (existing) return failure("A schedule already exists for this exam subject — update it instead", 409);

  const schedule = await prisma.examSchedule.create({
    data: { ...parsed.data, examId: examSubject.examId, subjectId: examSubject.subjectId },
  });

  await logAudit({ userId: guard.payload!.sub, action: "CREATE", entityType: "ExamSchedule", entityId: schedule.id, newValues: parsed.data, ipAddress, userAgent });

  return created(schedule);
}
