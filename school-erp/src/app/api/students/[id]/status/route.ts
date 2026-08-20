import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { updateStudentStatusSchema } from "@/lib/validators/student.validator";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("students.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateStudentStatusSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.student.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Student not found");

  const student = await prisma.$transaction(async (tx) => {
    const s = await tx.student.update({ where: { id: params.id }, data: { status: parsed.data.status } });
    await tx.studentHistory.create({
      data: {
        studentId: params.id,
        event: "STATUS_CHANGE",
        fromValue: existing.status,
        toValue: parsed.data.status,
        remarks: parsed.data.remarks,
        recordedById: guard.payload!.sub,
      },
    });
    return s;
  });

  await logAudit({
    userId: guard.payload!.sub,
    action: "UPDATE",
    entityType: "Student",
    entityId: student.id,
    oldValues: { status: existing.status },
    newValues: { status: parsed.data.status },
    ipAddress,
    userAgent,
  });
  await logActivity({
    userId: guard.payload!.sub,
    type: "STUDENT",
    description: `Status changed for ${student.firstName} ${student.lastName}: ${existing.status} → ${parsed.data.status}`,
  });

  return success(student, "Student status updated");
}
