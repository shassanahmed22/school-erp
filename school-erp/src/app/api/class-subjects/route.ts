import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { assignSubjectToClassSchema } from "@/lib/validators/subject.validator";
import { success, created, failure } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

/** Lists subjects assigned to a class, or all class-subject assignments. */
export async function GET(req: NextRequest) {
  const guard = await requirePermission("subjects.view");
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId") ?? undefined;

  const assignments = await prisma.classSubject.findMany({
    where: { ...(classId && { classId }) },
    include: {
      subject: true,
      class: { select: { name: true } },
      teacherSubjects: { include: { teacher: { select: { firstName: true, lastName: true } } } },
    },
  });

  return success(
    assignments.map((a) => ({
      id: a.id,
      classId: a.classId,
      className: a.class.name,
      subject: a.subject,
      isElective: a.isElective,
      teachers: a.teacherSubjects.map((ts) => ({ id: ts.teacherId, name: `${ts.teacher.firstName} ${ts.teacher.lastName}` })),
    }))
  );
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("subjects.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = assignSubjectToClassSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.classSubject.findUnique({
    where: { classId_subjectId: { classId: parsed.data.classId, subjectId: parsed.data.subjectId } },
  });
  if (existing) return failure("This subject is already assigned to this class", 409);

  const assignment = await prisma.classSubject.create({ data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "ClassSubject", entityId: assignment.id, newValues: parsed.data, ipAddress, userAgent });

  return created(assignment);
}
