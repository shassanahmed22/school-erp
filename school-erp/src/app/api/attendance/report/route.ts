import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { attendanceReportQuerySchema } from "@/lib/validators/attendance.validator";
import { computeStudentAttendanceSummary } from "@/lib/attendance-service";
import { success, failure } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const guard = await requirePermission("attendance.view");
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const parsed = attendanceReportQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return failure("Invalid query parameters", 422, parsed.error.flatten());

  const { classId, sectionId, studentId, month, year } = parsed.data;
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // Single student report
  if (studentId) {
    const summary = await computeStudentAttendanceSummary(studentId, { startDate, endDate });
    return success({ studentId, month, year, ...summary });
  }

  // Section/class-wide report: one row per enrolled student
  if (!sectionId && !classId) return failure("Provide studentId, sectionId, or classId", 422);

  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      status: "ACTIVE",
      ...(sectionId && { sectionId }),
      ...(classId && { section: { classId } }),
    },
    include: { student: { select: { id: true, firstName: true, lastName: true, registrationNumber: true } } },
  });

  const rows = await Promise.all(
    enrollments.map(async (e) => {
      const summary = await computeStudentAttendanceSummary(e.studentId, { startDate, endDate });
      return {
        studentId: e.student.id,
        studentName: `${e.student.firstName} ${e.student.lastName}`,
        registrationNumber: e.student.registrationNumber,
        rollNumber: e.rollNumber,
        ...summary,
      };
    })
  );

  return success({ month, year, students: rows });
}
