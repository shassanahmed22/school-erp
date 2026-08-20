import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { updateAttendanceSchema } from "@/lib/validators/attendance.validator";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("attendance.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateAttendanceSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.attendance.findUnique({ where: { id: params.id } });
  if (!existing) return notFound("Attendance record not found");

  const record = await prisma.attendance.update({
    where: { id: params.id },
    data: { ...parsed.data, markedById: guard.payload!.sub },
  });

  await logAudit({
    userId: guard.payload!.sub,
    action: "UPDATE",
    entityType: "Attendance",
    entityId: record.id,
    oldValues: { status: existing.status },
    newValues: parsed.data,
    ipAddress,
    userAgent,
  });

  return success(record, "Attendance updated");
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("attendance.delete");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.attendance.findUnique({ where: { id: params.id } });
  if (!existing) return notFound("Attendance record not found");

  await prisma.attendance.delete({ where: { id: params.id } });
  await logAudit({ userId: guard.payload!.sub, action: "DELETE", entityType: "Attendance", entityId: params.id, ipAddress, userAgent });

  return success(null, "Attendance record deleted");
}
