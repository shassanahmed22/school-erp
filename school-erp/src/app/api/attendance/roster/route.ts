import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { success, failure } from "@/lib/api-response";
import { z } from "zod";

const rosterQuerySchema = z.object({
  sectionId: z.string().uuid(),
  date: z.coerce.date(),
  subjectId: z.string().uuid().optional(),
});

export async function GET(req: NextRequest) {
  const guard = await requirePermission("attendance.view");
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const parsed = rosterQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return failure("Invalid query parameters", 422, parsed.error.flatten());

  const { sectionId, date, subjectId } = parsed.data;

  const section = await prisma.section.findFirst({
    where: { id: sectionId, deletedAt: null },
    include: { class: { select: { id: true, name: true } } },
  });
  if (!section) return failure("Section not found", 404);

  const enrollments = await prisma.studentEnrollment.findMany({
    where: { sectionId, status: "ACTIVE" },
    orderBy: { rollNumber: "asc" },
    include: { student: { select: { id: true, firstName: true, lastName: true, registrationNumber: true } } },
  });

  const existing = await prisma.attendance.findMany({
    where: { sectionId, date, subjectId: subjectId ?? null },
  });
  const existingByStudent = new Map(existing.map((a) => [a.studentId, a]));

  const roster = enrollments.map((e) => ({
    studentId: e.student.id,
    firstName: e.student.firstName,
    lastName: e.student.lastName,
    registrationNumber: e.student.registrationNumber,
    rollNumber: e.rollNumber,
    status: existingByStudent.get(e.student.id)?.status ?? "PRESENT",
    remarks: existingByStudent.get(e.student.id)?.remarks ?? "",
    alreadyMarked: existingByStudent.has(e.student.id),
  }));

  return success({
    classId: section.class.id,
    className: section.class.name,
    sectionId: section.id,
    sectionName: section.name,
    roster,
  });
}
