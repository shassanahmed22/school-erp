import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { resolveStudentScope, applyStudentScope } from "@/lib/student-scope";
import { bulkMarkAttendanceSchema, attendanceQuerySchema } from "@/lib/validators/attendance.validator";
import { paginated, success, failure, unauthorized } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const payload = await getCurrentUserFromCookies();
  if (!payload) return unauthorized();

  const { searchParams } = new URL(req.url);
  const parsed = attendanceQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return failure("Invalid query parameters", 422, parsed.error.flatten());

  const { classId, sectionId, subjectId, date, startDate, endDate, page, limit } = parsed.data;
  const requestedStudentId = parsed.data.studentId;

  // Students and parents are locked to their own / their children's records
  // regardless of what studentId they pass in — everyone else needs the
  // module permission, since this branch also serves the class-wide
  // attendance register.
  const scope = await resolveStudentScope(payload);
  if (scope.type === "unrestricted") {
    const guard = await requirePermission("attendance.view");
    if (guard.error) return guard.error;
  }
  const { studentIdFilter, forbidden } = applyStudentScope(scope, requestedStudentId);
  if (forbidden) return paginated([], { page, limit, total: 0 });

  const where = {
    ...(classId && { classId }),
    ...(sectionId && { sectionId }),
    ...(studentIdFilter && { studentId: studentIdFilter }),
    ...(subjectId !== undefined && { subjectId: subjectId ?? null }),
    ...(date && { date }),
    ...((startDate || endDate) && {
      date: { ...(startDate && { gte: startDate }), ...(endDate && { lte: endDate }) },
    }),
  };

  const [items, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ date: "desc" }],
      include: {
        student: { select: { firstName: true, lastName: true, registrationNumber: true } },
        subject: { select: { name: true } },
        markedBy: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.attendance.count({ where }),
  ]);

  const data = items.map((a) => ({
    id: a.id,
    studentId: a.studentId,
    studentName: `${a.student.firstName} ${a.student.lastName}`,
    registrationNumber: a.student.registrationNumber,
    classId: a.classId,
    sectionId: a.sectionId,
    subjectId: a.subjectId,
    subjectName: a.subject?.name ?? null,
    date: a.date,
    status: a.status,
    remarks: a.remarks,
    markedByName: a.markedBy ? `${a.markedBy.firstName} ${a.markedBy.lastName}` : null,
  }));

  return paginated(data, { page, limit, total });
}

/**
 * Bulk-marks attendance for an entire section (whole-day, or subject-wise if subjectId given).
 * Uses upsert per student so re-marking the same day safely overwrites, keeping the unique
 * constraint (studentId, date, subjectId) intact.
 */
export async function POST(req: NextRequest) {
  const guard = await requirePermission("attendance.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = bulkMarkAttendanceSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const { classId, sectionId, subjectId, date, entries } = parsed.data;

  const results = await prisma.$transaction(
    entries.map((entry) =>
      prisma.attendance.upsert({
        where: {
          studentId_date_subjectId: {
            studentId: entry.studentId,
            date,
            subjectId: subjectId ?? null,
          },
        },
        update: { status: entry.status, remarks: entry.remarks, markedById: guard.payload!.sub },
        create: {
          studentId: entry.studentId,
          classId,
          sectionId,
          subjectId: subjectId ?? null,
          date,
          status: entry.status,
          remarks: entry.remarks,
          markedById: guard.payload!.sub,
        },
      })
    )
  );

  await logAudit({
    userId: guard.payload!.sub,
    action: "CREATE",
    entityType: "Attendance",
    newValues: { classId, sectionId, subjectId, date, count: entries.length },
    ipAddress,
    userAgent,
  });
  await logActivity({
    userId: guard.payload!.sub,
    type: "ATTENDANCE",
    description: `Marked attendance for ${entries.length} student(s) on ${new Date(date).toLocaleDateString()}`,
  });

  return success({ marked: results.length }, "Attendance marked successfully");
}
