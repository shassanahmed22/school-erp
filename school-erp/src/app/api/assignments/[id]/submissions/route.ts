import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { submitAssignmentSchema } from "@/lib/validators/assignment-submission.validator";
import { success, created, failure, notFound, unauthorized } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

// Teachers/admins: list every student's submission status for this assignment (including non-submitters).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("assignments.view");
  if (guard.error) return guard.error;

  const assignment = await prisma.assignment.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!assignment) return notFound("Assignment not found");

  const [enrollments, submissions] = await Promise.all([
    prisma.studentEnrollment.findMany({
      where: { sectionId: assignment.sectionId, status: "ACTIVE" },
      include: { student: { select: { id: true, firstName: true, lastName: true, registrationNumber: true } } },
    }),
    prisma.assignmentSubmission.findMany({ where: { assignmentId: params.id } }),
  ]);

  const submissionByStudent = new Map(submissions.map((s) => [s.studentId, s]));

  const data = enrollments.map((e) => {
    const sub = submissionByStudent.get(e.student.id);
    return {
      studentId: e.student.id,
      studentName: `${e.student.firstName} ${e.student.lastName}`,
      registrationNumber: e.student.registrationNumber,
      submissionId: sub?.id ?? null,
      status: sub?.status ?? "PENDING",
      submittedAt: sub?.submittedAt ?? null,
      content: sub?.content ?? null,
      attachmentUrl: sub?.attachmentUrl ?? null,
      marksObtained: sub?.marksObtained ?? null,
      feedback: sub?.feedback ?? null,
      gradedAt: sub?.gradedAt ?? null,
    };
  });

  return success(data);
}

// Students: submit their own work for this assignment.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const payload = await getCurrentUserFromCookies();
  if (!payload) return unauthorized();
  const { ipAddress, userAgent } = getRequestMeta(req);

  if (!hasRole(payload, "student")) {
    return failure("Only students can submit assignments", 403);
  }

  const student = await prisma.student.findUnique({ where: { userId: payload.sub } });
  if (!student) return notFound("Student profile not found");

  const assignment = await prisma.assignment.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!assignment) return notFound("Assignment not found");
  if (assignment.status !== "PUBLISHED") return failure("This assignment is not accepting submissions", 409);

  const body = await req.json();
  const parsed = submitAssignmentSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const isLate = new Date() > new Date(assignment.dueDate);

  const submission = await prisma.assignmentSubmission.upsert({
    where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: student.id } },
    update: {
      content: parsed.data.content || null,
      attachmentUrl: parsed.data.attachmentUrl || null,
      status: isLate ? "LATE" : "SUBMITTED",
      submittedAt: new Date(),
    },
    create: {
      assignmentId: assignment.id,
      studentId: student.id,
      content: parsed.data.content || null,
      attachmentUrl: parsed.data.attachmentUrl || null,
      status: isLate ? "LATE" : "SUBMITTED",
    },
  });

  await logAudit({ userId: payload.sub, action: "CREATE", entityType: "AssignmentSubmission", entityId: submission.id, ipAddress, userAgent });
  await logActivity({ userId: payload.sub, type: "ASSIGNMENT", description: `Submitted assignment "${assignment.title}"` });

  return created(submission, isLate ? "Submitted (marked late)" : "Submitted successfully");
}
