import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { assignTeacherToSubjectSchema } from "@/lib/validators/subject.validator";
import { success, created, failure } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const guard = await requirePermission("teachers.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = assignTeacherToSubjectSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const assignment = await prisma.teacherSubject.create({ data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "TeacherSubject", entityId: assignment.id, newValues: parsed.data, ipAddress, userAgent });
  await logActivity({ userId: guard.payload!.sub, type: "TEACHER", description: "Assigned teacher to subject" });

  return created(assignment);
}

export async function DELETE(req: NextRequest) {
  const guard = await requirePermission("teachers.edit");
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return failure("Missing assignment id", 400);

  await prisma.teacherSubject.delete({ where: { id } });
  return success(null, "Assignment removed");
}
