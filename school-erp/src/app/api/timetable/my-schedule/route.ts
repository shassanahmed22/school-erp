import { prisma } from "@/lib/prisma";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { success, unauthorized } from "@/lib/api-response";

const DAY_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export async function GET() {
  const payload = await getCurrentUserFromCookies();
  if (!payload) return unauthorized();

  const teacher = await prisma.teacher.findUnique({ where: { userId: payload.sub } });
  if (!teacher) return success([]);

  const periods = await prisma.timetablePeriod.findMany({
    where: { teacherId: teacher.id, deletedAt: null },
    include: {
      subject: { select: { name: true } },
      section: { include: { class: { select: { name: true } } } },
    },
  });

  const data = periods
    .map((p) => ({
      id: p.id,
      dayOfWeek: p.dayOfWeek,
      periodNumber: p.periodNumber,
      startTime: p.startTime,
      endTime: p.endTime,
      roomNumber: p.roomNumber,
      subjectName: p.subject.name,
      className: p.section.class.name,
      sectionName: p.section.name,
    }))
    .sort((a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek) || a.periodNumber - b.periodNumber);

  return success(data);
}
