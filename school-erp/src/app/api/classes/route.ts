import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { createClassSchema } from "@/lib/validators/academic.validator";
import { success, created, failure } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const guard = await requirePermission("classes.view");
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const academicYearId = searchParams.get("academicYearId") ?? undefined;

  const classes = await prisma.class.findMany({
    where: { deletedAt: null, ...(academicYearId && { academicYearId }) },
    orderBy: { numericGrade: "asc" },
    include: {
      sections: {
        where: { deletedAt: null },
        include: {
          classTeacher: { include: { teacher: { select: { firstName: true, lastName: true } } } },
          _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
        },
      },
    },
  });

  const data = classes.map((c) => ({
    id: c.id,
    name: c.name,
    numericGrade: c.numericGrade,
    academicYearId: c.academicYearId,
    sections: c.sections.map((s) => ({
      id: s.id,
      name: s.name,
      classId: s.classId,
      capacity: s.capacity,
      studentCount: s._count.enrollments,
      classTeacherName: s.classTeacher
        ? `${s.classTeacher.teacher.firstName} ${s.classTeacher.teacher.lastName}`
        : null,
    })),
  }));

  return success(data);
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("classes.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = createClassSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.class.findFirst({
    where: { name: parsed.data.name, academicYearId: parsed.data.academicYearId, deletedAt: null },
  });
  if (existing) return failure("This class already exists for the selected academic year", 409);

  const cls = await prisma.class.create({ data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "CREATE", entityType: "Class", entityId: cls.id, newValues: parsed.data, ipAddress, userAgent });
  await logActivity({ userId: guard.payload!.sub, type: "CLASS", description: `Created class: ${cls.name}` });

  return created(cls);
}
