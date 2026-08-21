import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { createSectionSchema } from "@/lib/validators/academic.validator";
import { success, created, failure } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const guard = await requirePermission("sections.view");
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId") ?? undefined;

  const sections = await prisma.section.findMany({
    where: { deletedAt: null, ...(classId && { classId }) },
    orderBy: { name: "asc" },
    include: {
      class: { select: { name: true } },
      classTeacher: { include: { teacher: { select: { firstName: true, lastName: true } } } },
      _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
    },
  });

  return success(
    sections.map((s) => ({
      id: s.id,
      name: s.name,
      classId: s.classId,
      className: s.class.name,
      capacity: s.capacity,
      studentCount: s._count.enrollments,
      classTeacherName: s.classTeacher ? `${s.classTeacher.teacher.firstName} ${s.classTeacher.teacher.lastName}` : null,
    }))
  );
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("sections.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = createSectionSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const { classTeacherId, ...rest } = parsed.data;

  const existing = await prisma.section.findFirst({
    where: { name: rest.name, classId: rest.classId, deletedAt: null },
  });
  if (existing) return failure("This section already exists for the selected class", 409);

  const section = await prisma.section.create({
    data: {
      ...rest,
      ...(classTeacherId && { classTeacher: { create: { teacherId: classTeacherId } } }),
    },
  });

  await logAudit({ userId: guard.payload!.sub, action: "CREATE", entityType: "Section", entityId: section.id, newValues: parsed.data, ipAddress, userAgent });
  await logActivity({ userId: guard.payload!.sub, type: "CLASS", description: `Created section: ${section.name}` });

  return created(section);
}
