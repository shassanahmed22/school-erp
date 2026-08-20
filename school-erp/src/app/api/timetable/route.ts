import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { hasRole } from "@/lib/rbac";
import { createTimetablePeriodSchema } from "@/lib/validators/timetable.validator";
import { success, created, failure } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

const DAY_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

function serializePeriod(p: {
  id: string;
  sectionId: string;
  subjectId: string;
  teacherId: string | null;
  dayOfWeek: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  roomNumber: string | null;
  subject: { name: string };
  teacher: { firstName: string; lastName: string } | null;
}) {
  return {
    id: p.id,
    sectionId: p.sectionId,
    subjectId: p.subjectId,
    subjectName: p.subject.name,
    teacherId: p.teacherId,
    teacherName: p.teacher ? `${p.teacher.firstName} ${p.teacher.lastName}` : null,
    dayOfWeek: p.dayOfWeek,
    periodNumber: p.periodNumber,
    startTime: p.startTime,
    endTime: p.endTime,
    roomNumber: p.roomNumber,
  };
}

export async function GET(req: NextRequest) {
  const guard = await requirePermission("timetable.view");
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  let sectionId = searchParams.get("sectionId") || undefined;

  // Students see only their own currently-enrolled section's timetable.
  if (hasRole(guard.payload, "student") && !hasRole(guard.payload, "super-admin")) {
    const student = await prisma.student.findUnique({ where: { userId: guard.payload!.sub } });
    if (!student) return success([]);
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: { studentId: student.id, status: "ACTIVE" },
      orderBy: { enrolledAt: "desc" },
    });
    if (!enrollment) return success([]);
    sectionId = enrollment.sectionId;
  }

  if (!sectionId) return success([]);

  const periods = await prisma.timetablePeriod.findMany({
    where: { sectionId, deletedAt: null },
    include: {
      subject: { select: { name: true } },
      teacher: { select: { firstName: true, lastName: true } },
    },
  });

  const data = periods
    .map(serializePeriod)
    .sort((a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek) || a.periodNumber - b.periodNumber);

  return success(data);
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("timetable.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = createTimetablePeriodSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const { sectionId, subjectId, teacherId, dayOfWeek, periodNumber, startTime, endTime, roomNumber } = parsed.data;

  const section = await prisma.section.findFirst({ where: { id: sectionId, deletedAt: null } });
  if (!section) return failure("Selected section does not exist", 422);

  const subject = await prisma.subject.findFirst({ where: { id: subjectId, deletedAt: null } });
  if (!subject) return failure("Selected subject does not exist", 422);

  const slotTaken = await prisma.timetablePeriod.findFirst({
    where: { sectionId, dayOfWeek, periodNumber, deletedAt: null },
  });
  if (slotTaken) return failure("This section already has a period scheduled at this slot", 409);

  if (teacherId) {
    const teacherBusy = await prisma.timetablePeriod.findFirst({
      where: { teacherId, dayOfWeek, periodNumber, deletedAt: null },
      include: { section: { include: { class: { select: { name: true } } } } },
    });
    if (teacherBusy) {
      return failure(
        `This teacher is already scheduled for ${teacherBusy.section.class.name} - Section at this time`,
        409
      );
    }
  }

  const period = await prisma.timetablePeriod.create({
    data: { sectionId, subjectId, teacherId, dayOfWeek, periodNumber, startTime, endTime, roomNumber },
    include: { subject: { select: { name: true } }, teacher: { select: { firstName: true, lastName: true } } },
  });

  await logAudit({ userId: guard.payload!.sub, action: "CREATE", entityType: "TimetablePeriod", entityId: period.id, newValues: parsed.data, ipAddress, userAgent });
  await logActivity({ userId: guard.payload!.sub, type: "TIMETABLE", description: `Scheduled ${subject.name} on ${dayOfWeek} (period ${periodNumber})` });

  return created(serializePeriod(period));
}
