import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { updateAssignmentSchema } from "@/lib/validators/assignment.validator";
import { success, failure, notFound, unauthorized } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const payload = await getCurrentUserFromCookies();
  if (!payload) return unauthorized();

  const assignment = await prisma.assignment.findFirst({
    where: { id: params.id, deletedAt: null },
    include: {
      subject: { select: { name: true } },
      section: { include: { class: { select: { name: true } } } },
      teacher: { select: { firstName: true, lastName: true } },
    },
  });
  if (!assignment) return notFound("Assignment not found");

  let mySubmission = null;
  if (hasRole(payload, "student") && !hasRole(payload, "super-admin")) {
    const student = await prisma.student.findUnique({ where: { userId: payload.sub } });
    if (student) {
      mySubmission = await prisma.assignmentSubmission.findUnique({
        where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: student.id } },
      });
    }
  } else {
    const guard = await requirePermission("assignments.view");
    if (guard.error) return guard.error;
  }

  return success({
    id: assignment.id,
    sectionId: assignment.sectionId,
    className: assignment.section.class.name,
    sectionName: assignment.section.name,
    subjectId: assignment.subjectId,
    subjectName: assignment.subject.name,
    teacherId: assignment.teacherId,
    teacherName: assignment.teacher ? `${assignment.teacher.firstName} ${assignment.teacher.lastName}` : null,
    title: assignment.title,
    description: assignment.description,
    attachmentUrl: assignment.attachmentUrl,
    maxMarks: assignment.maxMarks,
    dueDate: assignment.dueDate,
    status: assignment.status,
    createdAt: assignment.createdAt,
    mySubmission,
  });
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("assignments.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateAssignmentSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.assignment.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Assignment not found");

  const { attachmentUrl, ...rest } = parsed.data;
  const assignment = await prisma.assignment.update({
    where: { id: params.id },
    data: { ...rest, ...(attachmentUrl !== undefined && { attachmentUrl: attachmentUrl || null }) },
  });

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "Assignment", entityId: assignment.id, newValues: parsed.data, ipAddress, userAgent });

  return success(assignment);
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("assignments.delete");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.assignment.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Assignment not found");

  await prisma.assignment.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  await logAudit({ userId: guard.payload!.sub, action: "DELETE", entityType: "Assignment", entityId: params.id, ipAddress, userAgent });

  return success(null, "Assignment deleted successfully");
}
