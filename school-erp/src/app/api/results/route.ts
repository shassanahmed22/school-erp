import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { resolveStudentScope, applyStudentScope } from "@/lib/student-scope";
import { resultQuerySchema } from "@/lib/validators/result.validator";
import { paginated, unauthorized, failure } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const payload = await getCurrentUserFromCookies();
  if (!payload) return unauthorized();

  const { searchParams } = new URL(req.url);
  const parsed = resultQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return failure("Invalid query parameters", 422, parsed.error.flatten());

  const { examId, status, page, limit } = parsed.data;
  const requestedStudentId = parsed.data.studentId;

  // Students see only their own results; parents only their linked children's.
  const scope = await resolveStudentScope(payload);
  if (scope.type === "unrestricted") {
    const guard = await requirePermission("results.view");
    if (guard.error) return guard.error;
  }
  const { studentIdFilter, forbidden } = applyStudentScope(scope, requestedStudentId);
  if (forbidden) return paginated([], { page, limit, total: 0 });

  const isSelfService = scope.type === "single" || scope.type === "list";

  const where = {
    ...(examId && { examId }),
    ...(studentIdFilter && { studentId: studentIdFilter }),
    // Non-privileged viewers (students/parents) only ever see published results
    status: isSelfService ? "PUBLISHED" as const : status,
  };

  const [items, total] = await Promise.all([
    prisma.studentResult.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ position: "asc" }, { obtainedMarks: "desc" }],
      include: {
        student: { select: { firstName: true, lastName: true, registrationNumber: true } },
        exam: { select: { name: true, type: true, classId: true, class: { select: { name: true } } } },
      },
    }),
    prisma.studentResult.count({ where }),
  ]);

  const data = items.map((r) => ({
    id: r.id,
    studentId: r.studentId,
    studentName: `${r.student.firstName} ${r.student.lastName}`,
    registrationNumber: r.student.registrationNumber,
    examId: r.examId,
    examName: r.exam.name,
    examType: r.exam.type,
    className: r.exam.class.name,
    totalMarks: r.totalMarks,
    obtainedMarks: r.obtainedMarks,
    percentage: r.percentage,
    grade: r.grade,
    gpa: r.gpa,
    position: r.position,
    status: r.status,
  }));

  return paginated(data, { page, limit, total });
}
