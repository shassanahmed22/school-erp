import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { bulkEnterMarksSchema } from "@/lib/validators/result.validator";
import { computeStudentResult, computeExamRankings } from "@/lib/grade-service";
import { success, failure } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

/**
 * Accepts marks for ONE exam-subject across many students, then recomputes each
 * affected student's overall StudentResult (total/percentage/grade/GPA) from
 * ALL of their SubjectMarks so far, and refreshes class rankings for the exam.
 */
export async function POST(req: NextRequest) {
  const guard = await requirePermission("results.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = bulkEnterMarksSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const { examId, examSubjectId, entries } = parsed.data;

  const examSubject = await prisma.examSubject.findFirst({ where: { id: examSubjectId, examId } });
  if (!examSubject) return failure("Exam subject not found for this exam", 404);

  const allExamSubjects = await prisma.examSubject.findMany({ where: { examId } });

  // Batch-fetch every student's existing marks in one query instead of one
  // findMany per student in the loop below (was N sequential queries for a
  // class of N students).
  const studentIds = entries.map((e) => e.studentId);
  const allExistingMarks = await prisma.subjectMarks.findMany({
    where: { examSubject: { examId }, result: { studentId: { in: studentIds } } },
    include: { result: { select: { studentId: true } } },
  });
  const marksByStudent = new Map<string, typeof allExistingMarks>();
  for (const m of allExistingMarks) {
    const list = marksByStudent.get(m.result.studentId) ?? [];
    list.push(m);
    marksByStudent.set(m.result.studentId, list);
  }

  // Each call below runs in its own independent $transaction (one student's
  // result row), so they're safe to run concurrently rather than one-by-one.
  await Promise.all(
    entries.map((entry) => {
      const existingMarks = marksByStudent.get(entry.studentId) ?? [];
      const marksMap = new Map(existingMarks.map((m) => [m.examSubjectId, { obtainedMarks: Number(m.obtainedMarks), isAbsent: m.isAbsent }]));
      marksMap.set(examSubjectId, { obtainedMarks: entry.obtainedMarks, isAbsent: entry.isAbsent });

      // Only compute subjects that actually have marks recorded; unmarked subjects
      // are simply not yet included in the running total.
      const marks = allExamSubjects
        .filter((es) => marksMap.has(es.id))
        .map((es) => ({ examSubjectId: es.id, ...marksMap.get(es.id)! }));

      return computeStudentResult({ examId, studentId: entry.studentId, marks, computedById: guard.payload!.sub });
    })
  );

  await computeExamRankings(examId);

  await logAudit({
    userId: guard.payload!.sub,
    action: "CREATE",
    entityType: "SubjectMarks",
    newValues: { examId, examSubjectId, count: entries.length },
    ipAddress,
    userAgent,
  });
  await logActivity({
    userId: guard.payload!.sub,
    type: "RESULT",
    description: `Entered marks for ${entries.length} student(s)`,
  });

  return success({ processed: entries.length }, "Marks saved and results recomputed");
}
