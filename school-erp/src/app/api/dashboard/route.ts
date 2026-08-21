import { prisma } from "@/lib/prisma";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { success, unauthorized } from "@/lib/api-response";
import { hasRole } from "@/lib/rbac";
import { computeTodayAttendanceStats, computeStudentAttendanceSummary } from "@/lib/attendance-service";

const ADMIN_ROLES = ["super-admin", "principal", "vice-principal", "admin-staff"];

export async function GET() {
  const payload = await getCurrentUserFromCookies();
  if (!payload) return unauthorized();

  const isAdmin = ADMIN_ROLES.some((r) => hasRole(payload, r));
  const isTeacher = hasRole(payload, "teacher");
  const isStudent = hasRole(payload, "student");

  // ---- Admin / staff view: school-wide totals ----
  if (isAdmin) {
    const [
      totalStudents, totalTeachers, totalClasses, totalSections, recentAdmissions,
      todayAttendance, upcomingExams, recentResults,
    ] = await Promise.all([
      prisma.student.count({ where: { deletedAt: null, status: "ACTIVE" } }),
      prisma.teacher.count({ where: { deletedAt: null, status: "ACTIVE" } }),
      prisma.class.count({ where: { deletedAt: null } }),
      prisma.section.count({ where: { deletedAt: null } }),
      prisma.student.findMany({
        where: { deletedAt: null },
        orderBy: { admissionDate: "desc" },
        take: 5,
        select: { id: true, firstName: true, lastName: true, registrationNumber: true, admissionDate: true },
      }),
      computeTodayAttendanceStats(),
      prisma.exam.findMany({
        where: { deletedAt: null, status: { in: ["SCHEDULED", "ONGOING"] }, startDate: { gte: new Date() } },
        orderBy: { startDate: "asc" },
        take: 5,
        select: { id: true, name: true, type: true, startDate: true, class: { select: { name: true } } },
      }),
      prisma.studentResult.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        take: 5,
        select: {
          id: true, percentage: true, grade: true,
          student: { select: { firstName: true, lastName: true } },
          exam: { select: { name: true, class: { select: { name: true } } } },
        },
      }),
    ]);

    // Class performance: average percentage per class across published results
    const classPerformanceRaw = await prisma.studentResult.groupBy({
      by: ["examId"],
      where: { status: "PUBLISHED" },
      _avg: { percentage: true },
    });
    const examIds = classPerformanceRaw.map((c) => c.examId);
    const examsForPerf = await prisma.exam.findMany({
      where: { id: { in: examIds } },
      select: { id: true, class: { select: { name: true } } },
    });
    const classPerfMap = new Map<string, { total: number; count: number }>();
    for (const row of classPerformanceRaw) {
      const exam = examsForPerf.find((e) => e.id === row.examId);
      if (!exam) continue;
      const existing = classPerfMap.get(exam.class.name) ?? { total: 0, count: 0 };
      existing.total += Number(row._avg.percentage ?? 0);
      existing.count += 1;
      classPerfMap.set(exam.class.name, existing);
    }
    const classPerformance = Array.from(classPerfMap.entries())
      .map(([className, v]) => ({ className, averagePercentage: Math.round((v.total / v.count) * 100) / 100 }))
      .sort((a, b) => b.averagePercentage - a.averagePercentage)
      .slice(0, 5);

    return success({
      role: "admin",
      totalStudents,
      totalTeachers,
      totalClasses,
      totalSections,
      recentAdmissions,
      todayAttendance,
      upcomingExams: upcomingExams.map((e) => ({ id: e.id, name: e.name, type: e.type, startDate: e.startDate, className: e.class.name })),
      recentResults: recentResults.map((r) => ({
        id: r.id,
        studentName: `${r.student.firstName} ${r.student.lastName}`,
        examName: r.exam.name,
        className: r.exam.class.name,
        percentage: r.percentage,
        grade: r.grade,
      })),
      classPerformance,
    });
  }

  // ---- Teacher view: their assigned classes/subjects/students ----
  if (isTeacher) {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: payload.sub },
      include: {
        classTeacherOf: { include: { section: { include: { class: true, _count: { select: { enrollments: { where: { status: "ACTIVE" } } } } } } } },
        teacherSubjects: { include: { subject: true, classSubject: { include: { class: true } } } },
      },
    });

    if (!teacher) {
      return success({ role: "teacher", linked: false, message: "No teacher record linked to this account yet." });
    }

    const totalStudents = teacher.classTeacherOf.reduce((sum, ct) => sum + ct.section._count.enrollments, 0);

    // Today's attendance-marked count across sections this teacher is class teacher of
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const sectionIds = teacher.classTeacherOf.map((ct) => ct.sectionId);

    // Independent of each other — both only depend on `teacher`, resolved above.
    const [todayMarkedCount, upcomingExams] = await Promise.all([
      sectionIds.length
        ? prisma.attendance.count({ where: { sectionId: { in: sectionIds }, date: { gte: today, lt: tomorrow }, subjectId: null } })
        : Promise.resolve(0),
      prisma.exam.findMany({
        where: {
          deletedAt: null,
          status: { in: ["SCHEDULED", "ONGOING"] },
          startDate: { gte: new Date() },
          classId: { in: teacher.teacherSubjects.map((ts) => ts.classSubject?.class.id).filter(Boolean) as string[] },
        },
        orderBy: { startDate: "asc" },
        take: 5,
        select: { id: true, name: true, type: true, startDate: true, class: { select: { name: true } } },
      }),
    ]);

    return success({
      role: "teacher",
      linked: true,
      teacherName: `${teacher.firstName} ${teacher.lastName}`,
      classTeacherOf: teacher.classTeacherOf.map((ct) => ({
        className: ct.section.class.name,
        sectionName: ct.section.name,
        studentCount: ct.section._count.enrollments,
      })),
      totalStudents,
      todayAttendanceMarked: todayMarkedCount,
      subjects: teacher.teacherSubjects.map((ts) => ({
        subjectName: ts.subject.name,
        className: ts.classSubject?.class.name ?? null,
      })),
      totalAssignedSubjects: teacher.teacherSubjects.length,
      upcomingExams: upcomingExams.map((e) => ({ id: e.id, name: e.name, type: e.type, startDate: e.startDate, className: e.class.name })),
    });
  }

  // ---- Student view: own profile + class info ----
  if (isStudent) {
    const student = await prisma.student.findUnique({
      where: { userId: payload.sub },
      include: {
        profile: true,
        enrollments: {
          where: { status: "ACTIVE" },
          take: 1,
          orderBy: { enrolledAt: "desc" },
          include: { section: { include: { class: true, classTeacher: { include: { teacher: true } } } } },
        },
      },
    });

    if (!student) {
      return success({ role: "student", linked: false, message: "No student record linked to this account yet." });
    }

    const enrollment = student.enrollments[0];
    const now = new Date();

    // These three queries are all independent of each other (only depend on
    // `student.id` / `enrollment`, already resolved above) — running them
    // sequentially was pure wasted latency.
    const [attendanceSummary, recentResults, upcomingExams] = await Promise.all([
      computeStudentAttendanceSummary(student.id, {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: now,
      }),
      prisma.studentResult.findMany({
        where: { studentId: student.id, status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        take: 5,
        select: { id: true, percentage: true, grade: true, position: true, exam: { select: { name: true } } },
      }),
      enrollment
        ? prisma.exam.findMany({
            where: { deletedAt: null, classId: enrollment.section.class.id, status: { in: ["SCHEDULED", "ONGOING"] }, startDate: { gte: now } },
            orderBy: { startDate: "asc" },
            take: 5,
            select: { id: true, name: true, type: true, startDate: true },
          })
        : Promise.resolve([]),
    ]);

    return success({
      role: "student",
      linked: true,
      registrationNumber: student.registrationNumber,
      name: `${student.firstName} ${student.lastName}`,
      status: student.status,
      photoUrl: student.profile?.photoUrl ?? null,
      className: enrollment?.section.class.name ?? null,
      sectionName: enrollment?.section.name ?? null,
      rollNumber: enrollment?.rollNumber ?? null,
      classTeacherName: enrollment?.section.classTeacher
        ? `${enrollment.section.classTeacher.teacher.firstName} ${enrollment.section.classTeacher.teacher.lastName}`
        : null,
      attendancePercentage: attendanceSummary.percentage,
      upcomingExams,
      recentResults: recentResults.map((r) => ({
        id: r.id, examName: r.exam.name, percentage: r.percentage, grade: r.grade, position: r.position,
      })),
    });
  }

  // ---- Fallback (parent, receptionist, librarian, accountant, etc.) ----
  return success({ role: "other" });
}
