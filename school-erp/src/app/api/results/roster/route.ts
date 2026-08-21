import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { success, failure } from "@/lib/api-response";
import { z } from "zod";

const rosterQuerySchema = z.object({ examSubjectId: z.string().uuid() });

export async function GET(req: NextRequest) {
  const guard = await requirePermission("results.view");
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const parsed = rosterQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return failure("Invalid query parameters", 422, parsed.error.flatten());

  const examSubject = await prisma.examSubject.findUnique({
    where: { id: parsed.data.examSubjectId },
    include: { exam: { select: { id: true, classId: true } }, subject: { select: { name: true } } },
  });
  if (!examSubject) return failure("Exam subject not found", 404);

  const enrollments = await prisma.studentEnrollment.findMany({
    where: { status: "ACTIVE", section: { classId: examSubject.exam.classId } },
    orderBy: { rollNumber: "asc" },
    include: { student: { select: { id: true, firstName: true, lastName: true, registrationNumber: true } } },
  });

  const existingMarks = await prisma.subjectMarks.findMany({
    where: { examSubjectId: examSubject.id },
    include: { result: { select: { studentId: true } } },
  });
  const marksByStudent = new Map<string, { obtainedMarks: number; isAbsent: boolean }>();
  for (const m of existingMarks) {
    marksByStudent.set(m.result.studentId, { obtainedMarks: Number(m.obtainedMarks), isAbsent: m.isAbsent });
  }

  const roster = enrollments.map((e) => ({
    studentId: e.student.id,
    firstName: e.student.firstName,
    lastName: e.student.lastName,
    registrationNumber: e.student.registrationNumber,
    rollNumber: e.rollNumber,
    obtainedMarks: marksByStudent.get(e.student.id)?.obtainedMarks ?? 0,
    isAbsent: marksByStudent.get(e.student.id)?.isAbsent ?? false,
  }));

  return success({
    examId: examSubject.exam.id,
    subjectName: examSubject.subject.name,
    totalMarks: examSubject.totalMarks,
    passingMarks: examSubject.passingMarks,
    roster,
  });
}
