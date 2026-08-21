import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { can, hasRole } from "@/lib/rbac";
import { success, unauthorized, forbidden, notFound } from "@/lib/api-response";

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const payload = await getCurrentUserFromCookies();
  if (!payload) return unauthorized();

  const result = await prisma.studentResult.findUnique({
    where: { id: params.id },
    include: {
      student: {
        select: { id: true, firstName: true, lastName: true, registrationNumber: true, userId: true },
      },
      exam: {
        include: { class: { select: { name: true } }, academicYear: { select: { name: true } } },
      },
      subjectMarks: {
        include: { examSubject: { include: { subject: { select: { name: true } } } } },
      },
    },
  });

  if (!result) return notFound("Result not found");

  // Access control: admins/staff with results.view, or the student themself, may view.
  const isOwner = hasRole(payload, "student") && result.student.userId === payload.sub;
  if (!isOwner && !can(payload, "results.view")) return forbidden();
  if (isOwner && result.status !== "PUBLISHED") return forbidden("This result has not been published yet");

  return success({
    id: result.id,
    student: result.student,
    exam: {
      id: result.exam.id,
      name: result.exam.name,
      type: result.exam.type,
      className: result.exam.class.name,
      academicYearName: result.exam.academicYear.name,
    },
    totalMarks: result.totalMarks,
    obtainedMarks: result.obtainedMarks,
    percentage: result.percentage,
    grade: result.grade,
    gpa: result.gpa,
    position: result.position,
    status: result.status,
    remarks: result.remarks,
    subjects: result.subjectMarks.map((sm) => ({
      subjectName: sm.examSubject.subject.name,
      totalMarks: sm.examSubject.totalMarks,
      obtainedMarks: sm.obtainedMarks,
      grade: sm.grade,
      isAbsent: sm.isAbsent,
    })),
  });
}
