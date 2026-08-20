import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { enrollStudentSchema } from "@/lib/validators/academic.validator";
import { success, created, failure } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const guard = await requirePermission("enrollments.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = enrollStudentSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const section = await prisma.section.findFirst({ where: { id: parsed.data.sectionId, deletedAt: null } });
  if (!section) return failure("Section not found", 404);

  const activeCount = await prisma.studentEnrollment.count({ where: { sectionId: parsed.data.sectionId, status: "ACTIVE" } });
  if (activeCount >= section.capacity) return failure("This section is at full capacity", 409);

  const existingEnrollment = await prisma.studentEnrollment.findUnique({
    where: { studentId_academicYearId: { studentId: parsed.data.studentId, academicYearId: parsed.data.academicYearId } },
  });
  if (existingEnrollment) return failure("Student is already enrolled for this academic year", 409);

  const enrollment = await prisma.studentEnrollment.create({ data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "CREATE", entityType: "StudentEnrollment", entityId: enrollment.id, newValues: parsed.data, ipAddress, userAgent });
  await logActivity({ userId: guard.payload!.sub, type: "ENROLLMENT", description: "Enrolled student into section" });

  return created(enrollment);
}
