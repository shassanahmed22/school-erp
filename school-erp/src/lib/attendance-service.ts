import { prisma } from "./prisma";

export interface AttendanceSummary {
  totalDays: number;
  present: number;
  absent: number;
  leave: number;
  late: number;
  percentage: number; // (present + late) / totalDays * 100
}

/** Computes an attendance summary for one student over an optional date range. */
export async function computeStudentAttendanceSummary(
  studentId: string,
  range?: { startDate?: Date; endDate?: Date }
): Promise<AttendanceSummary> {
  const records = await prisma.attendance.findMany({
    where: {
      studentId,
      subjectId: null, // whole-day records only, to avoid double counting subject-wise entries
      ...(range?.startDate || range?.endDate
        ? { date: { ...(range.startDate && { gte: range.startDate }), ...(range.endDate && { lte: range.endDate }) } }
        : {}),
    },
    select: { status: true },
  });

  const totalDays = records.length;
  const present = records.filter((r) => r.status === "PRESENT").length;
  const absent = records.filter((r) => r.status === "ABSENT").length;
  const leave = records.filter((r) => r.status === "LEAVE").length;
  const late = records.filter((r) => r.status === "LATE").length;
  const percentage = totalDays > 0 ? Math.round(((present + late) / totalDays) * 10000) / 100 : 0;

  return { totalDays, present, absent, leave, late, percentage };
}

/** Computes today's whole-day attendance breakdown across the entire school (for the admin dashboard). */
export async function computeTodayAttendanceStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const records = await prisma.attendance.findMany({
    where: { date: { gte: today, lt: tomorrow }, subjectId: null },
    select: { status: true },
  });

  const total = records.length;
  const present = records.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
  const percentage = total > 0 ? Math.round((present / total) * 10000) / 100 : 0;

  return { totalMarked: total, present, percentage };
}
