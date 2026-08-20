import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { createTeacherSchema, teacherQuerySchema } from "@/lib/validators/teacher.validator";
import { generateTeacherEmployeeCode } from "@/lib/id-generator";
import { createPortalAccount, type GeneratedCredential } from "@/lib/credentials";
import { paginated, created, failure } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const guard = await requirePermission("teachers.view");
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const parsed = teacherQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return failure("Invalid query parameters", 422, parsed.error.flatten());

  const { page, limit, search, status, subjectId } = parsed.data;

  const where = {
    deletedAt: null,
    ...(status && { status }),
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: "insensitive" as const } },
        { lastName: { contains: search, mode: "insensitive" as const } },
        { employeeCode: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(subjectId && { teacherSubjects: { some: { subjectId } } }),
  };

  const [items, total] = await Promise.all([
    prisma.teacher.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        designation: true,
        profile: { select: { photoUrl: true } },
        classTeacherOf: {
          select: { section: { select: { name: true, class: { select: { name: true } } } } },
        },
        _count: { select: { teacherSubjects: true } },
      },
    }),
    prisma.teacher.count({ where }),
  ]);

  const data = items.map((t) => ({
    id: t.id,
    employeeCode: t.employeeCode,
    firstName: t.firstName,
    lastName: t.lastName,
    email: t.email,
    phone: t.phone,
    status: t.status,
    designation: t.designation,
    photoUrl: t.profile?.photoUrl ?? null,
    subjectCount: t._count.teacherSubjects,
    sectionName: t.classTeacherOf.length > 0
      ? t.classTeacherOf.map((ct) => `${ct.section.class.name} - ${ct.section.name}`).join(", ")
      : null,
  }));

  return paginated(data, { page, limit, total });
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("teachers.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = createTeacherSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const {
    firstName, lastName, email, phone, designation, status,
    dateOfBirth, gender, bloodGroup, nationality, address, city, photoUrl, cnic,
    experienceYears, specialization, emergencyContactName, emergencyContactPhone,
    qualifications, subjectIds,
  } = parsed.data;

  const existing = await prisma.teacher.findFirst({ where: { email, deletedAt: null } });
  if (existing) return failure("A teacher with this email already exists", 409);

  const existingUser = await prisma.user.findFirst({ where: { email, deletedAt: null } });
  if (existingUser) return failure("This email is already used by another portal account", 409);

  const employeeCode = await generateTeacherEmployeeCode();

  const { teacher, credentials } = await prisma.$transaction(async (tx) => {
    const t = await tx.teacher.create({
      data: {
        employeeCode,
        firstName,
        lastName,
        email,
        phone,
        designation,
        status,
        createdById: guard.payload!.sub,
        profile: {
          create: {
            dateOfBirth, gender, bloodGroup, nationality, address, city, photoUrl, cnic,
            experienceYears, specialization, emergencyContactName, emergencyContactPhone,
          },
        },
        ...(qualifications.length > 0 && { qualifications: { create: qualifications } }),
        ...(subjectIds.length > 0 && {
          teacherSubjects: { create: subjectIds.map((subjectId) => ({ subjectId })) },
        }),
      },
    });

    // Every teacher gets a portal login automatically, using the email on file.
    const { user, temporaryPassword } = await createPortalAccount({
      tx,
      firstName,
      lastName,
      email,
      roleSlug: "teacher",
      createdById: guard.payload!.sub,
    });
    await tx.teacher.update({ where: { id: t.id }, data: { userId: user.id } });

    const generatedCredential: GeneratedCredential = {
      forName: `${firstName} ${lastName} (teacher)`,
      role: "teacher",
      email: user.email,
      temporaryPassword,
    };

    return { teacher: t, credentials: [generatedCredential] };
  });

  await logAudit({
    userId: guard.payload!.sub,
    action: "CREATE",
    entityType: "Teacher",
    entityId: teacher.id,
    newValues: { employeeCode, firstName, lastName },
    ipAddress,
    userAgent,
  });
  await logActivity({
    userId: guard.payload!.sub,
    type: "TEACHER",
    description: `New teacher registered: ${teacher.firstName} ${teacher.lastName} (${employeeCode})`,
  });

  return created({ id: teacher.id, employeeCode: teacher.employeeCode, credentials });
}
