import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { createAssignmentSchema } from "@/lib/validators/assignment.validator";
import { success, created, failure, unauthorized } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const payload = await getCurrentUserFromCookies();
  if (!payload) return unauthorized();

  const { searchParams } = new URL(req.url);
  let sectionId = searchParams.get("sectionId") || undefined;
  const subjectId = searchParams.get("subjectId") || undefined;

  let studentId: string | undefined;

  // Students only ever see published assignments for their own currently-enrolled section.
  if (hasRole(payload, "student") && !hasRole(payload, "super-admin")) {
    const student = await prisma.student.findUnique({ where: { userId: payload.sub } });
    if (!student) return success([]);
    studentId = student.id;
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: { studentId: student.id, status: "ACTIVE" },
      orderBy: { enrolledAt: "desc" },
    });
    if (!enrollment) return success([]);
    sectionId = enrollment.sectionId;
  } else {
    const guard = await requirePermission("assignments.view");
    if (guard.error) return guard.error;
  }

  const assignments = await prisma.assignment.findMany({
    where: {
      deletedAt: null,
      ...(sectionId && { sectionId }),
      ...(subjectId && { subjectId }),
      ...(studentId && { status: "PUBLISHED" }),
    },
    orderBy: { dueDate: "desc" },
    take: 200,
    include: {
      subject: { select: { name: true } },
      section: { include: { class: { select: { name: true } } } },
      teacher: { select: { firstName: true, lastName: true } },
      submissions: studentId ? { where: { studentId } } : false,
      _count: { select: { submissions: true } },
    },
  });

  const data = assignments.map((a) => ({
    id: a.id,
    sectionId: a.sectionId,
    className: a.section.class.name,
    sectionName: a.section.name,
    subjectId: a.subjectId,
    subjectName: a.subject.name,
    teacherId: a.teacherId,
    teacherName: a.teacher ? `${a.teacher.firstName} ${a.teacher.lastName}` : null,
    title: a.title,
    description: a.description,
    attachmentUrl: a.attachmentUrl,
    maxMarks: a.maxMarks,
    dueDate: a.dueDate,
    status: a.status,
    createdAt: a.createdAt,
    submissionCount: a._count.submissions,
    mySubmission: studentId && a.submissions?.[0]
      ? {
          id: a.submissions[0].id,
          status: a.submissions[0].status,
          submittedAt: a.submissions[0].submittedAt,
          marksObtained: a.submissions[0].marksObtained,
          feedback: a.submissions[0].feedback,
        }
      : null,
  }));

  return success(data);
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("assignments.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = createAssignmentSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const section = await prisma.section.findFirst({ where: { id: parsed.data.sectionId, deletedAt: null } });
  if (!section) return failure("Selected section does not exist", 422);

  const subject = await prisma.subject.findFirst({ where: { id: parsed.data.subjectId, deletedAt: null } });
  if (!subject) return failure("Selected subject does not exist", 422);

  const teacher = await prisma.teacher.findUnique({ where: { userId: guard.payload!.sub } });

  const assignment = await prisma.assignment.create({
    data: {
      sectionId: parsed.data.sectionId,
      subjectId: parsed.data.subjectId,
      teacherId: teacher?.id,
      title: parsed.data.title,
      description: parsed.data.description,
      attachmentUrl: parsed.data.attachmentUrl || undefined,
      maxMarks: parsed.data.maxMarks,
      dueDate: parsed.data.dueDate,
      status: parsed.data.status,
    },
  });

  await logAudit({ userId: guard.payload!.sub, action: "CREATE", entityType: "Assignment", entityId: assignment.id, newValues: parsed.data, ipAddress, userAgent });
  await logActivity({ userId: guard.payload!.sub, type: "ASSIGNMENT", description: `Posted assignment "${assignment.title}"` });

  return created(assignment);
}
