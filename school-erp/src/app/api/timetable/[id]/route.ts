import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { updateTimetablePeriodSchema } from "@/lib/validators/timetable.validator";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("timetable.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateTimetablePeriodSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.timetablePeriod.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Timetable period not found");

  const sectionId = parsed.data.sectionId ?? existing.sectionId;
  const dayOfWeek = parsed.data.dayOfWeek ?? existing.dayOfWeek;
  const periodNumber = parsed.data.periodNumber ?? existing.periodNumber;
  const teacherId = parsed.data.teacherId !== undefined ? parsed.data.teacherId : existing.teacherId;

  const slotTaken = await prisma.timetablePeriod.findFirst({
    where: { sectionId, dayOfWeek, periodNumber, deletedAt: null, id: { not: params.id } },
  });
  if (slotTaken) return failure("This section already has a period scheduled at this slot", 409);

  if (teacherId) {
    const teacherBusy = await prisma.timetablePeriod.findFirst({
      where: { teacherId, dayOfWeek, periodNumber, deletedAt: null, id: { not: params.id } },
      include: { section: { include: { class: { select: { name: true } } } } },
    });
    if (teacherBusy) {
      return failure(`This teacher is already scheduled for ${teacherBusy.section.class.name} - Section at this time`, 409);
    }
  }

  const period = await prisma.timetablePeriod.update({
    where: { id: params.id },
    data: parsed.data,
    include: { subject: { select: { name: true } }, teacher: { select: { firstName: true, lastName: true } } },
  });

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "TimetablePeriod", entityId: period.id, newValues: parsed.data, ipAddress, userAgent });

  return success({
    id: period.id,
    sectionId: period.sectionId,
    subjectId: period.subjectId,
    subjectName: period.subject.name,
    teacherId: period.teacherId,
    teacherName: period.teacher ? `${period.teacher.firstName} ${period.teacher.lastName}` : null,
    dayOfWeek: period.dayOfWeek,
    periodNumber: period.periodNumber,
    startTime: period.startTime,
    endTime: period.endTime,
    roomNumber: period.roomNumber,
  });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("timetable.delete");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.timetablePeriod.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Timetable period not found");

  await prisma.timetablePeriod.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  await logAudit({ userId: guard.payload!.sub, action: "DELETE", entityType: "TimetablePeriod", entityId: params.id, ipAddress, userAgent });

  return success(null, "Period removed from timetable");
}
