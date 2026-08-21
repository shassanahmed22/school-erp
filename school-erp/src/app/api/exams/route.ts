import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { createExamSchema, examQuerySchema } from "@/lib/validators/exam.validator";
import { paginated, created, failure } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const guard = await requirePermission("exams.view");
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const parsed = examQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return failure("Invalid query parameters", 422, parsed.error.flatten());

  const { page, limit, academicYearId, classId, status } = parsed.data;

  const where = {
    deletedAt: null,
    ...(academicYearId && { academicYearId }),
    ...(classId && { classId }),
    ...(status && { status }),
  };

  const [items, total] = await Promise.all([
    prisma.exam.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { startDate: "desc" },
      include: {
        class: { select: { name: true } },
        academicYear: { select: { name: true } },
        examSubjects: { include: { subject: { select: { name: true } } } },
        _count: { select: { results: true } },
      },
    }),
    prisma.exam.count({ where }),
  ]);

  const data = items.map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    status: e.status,
    className: e.class.name,
    academicYearName: e.academicYear.name,
    startDate: e.startDate,
    endDate: e.endDate,
    subjectCount: e.examSubjects.length,
    subjects: e.examSubjects.map((es) => es.subject.name),
    resultCount: e._count.results,
  }));

  return paginated(data, { page, limit, total });
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("exams.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = createExamSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const { subjects, ...examData } = parsed.data;

  const exam = await prisma.exam.create({
    data: {
      ...examData,
      createdById: guard.payload!.sub,
      examSubjects: { create: subjects },
    },
    include: { examSubjects: { include: { subject: true } } },
  });

  await logAudit({
    userId: guard.payload!.sub,
    action: "CREATE",
    entityType: "Exam",
    entityId: exam.id,
    newValues: { name: exam.name, type: exam.type, subjectCount: subjects.length },
    ipAddress,
    userAgent,
  });
  await logActivity({ userId: guard.payload!.sub, type: "EXAM", description: `Created exam: ${exam.name}` });

  return created(exam);
}
