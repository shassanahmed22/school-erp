import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { createStudentSchema, studentQuerySchema } from "@/lib/validators/student.validator";
import { generateStudentRegistrationNumber } from "@/lib/id-generator";
import { createPortalAccount, buildSyntheticEmail, type GeneratedCredential } from "@/lib/credentials";
import { syncStudentGuardians } from "@/lib/guardian-service";
import { paginated, created, failure } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const guard = await requirePermission("students.view");
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const parsed = studentQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return failure("Invalid query parameters", 422, parsed.error.flatten());

  const { page, limit, search, status, sectionId, classId } = parsed.data;

  const where = {
    deletedAt: null,
    ...(status && { status }),
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: "insensitive" as const } },
        { lastName: { contains: search, mode: "insensitive" as const } },
        { registrationNumber: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...((sectionId || classId) && {
      enrollments: {
        some: {
          status: "ACTIVE" as const,
          ...(sectionId && { sectionId }),
          ...(classId && { section: { classId } }),
        },
      },
    }),
  };

  const [items, total] = await Promise.all([
    prisma.student.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        registrationNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        admissionDate: true,
        profile: { select: { photoUrl: true } },
        enrollments: {
          where: { status: "ACTIVE" },
          take: 1,
          orderBy: { enrolledAt: "desc" },
          select: {
            section: { select: { name: true, class: { select: { name: true } } } },
          },
        },
      },
    }),
    prisma.student.count({ where }),
  ]);

  const data = items.map((s) => ({
    id: s.id,
    registrationNumber: s.registrationNumber,
    firstName: s.firstName,
    lastName: s.lastName,
    email: s.email,
    phone: s.phone,
    status: s.status,
    photoUrl: s.profile?.photoUrl ?? null,
    className: s.enrollments[0]?.section.class.name ?? null,
    sectionName: s.enrollments[0]?.section.name ?? null,
    admissionDate: s.admissionDate,
  }));

  return paginated(data, { page, limit, total });
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("students.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = createStudentSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const {
    firstName, lastName, email, phone, status,
    dateOfBirth, gender, bloodGroup, nationality, religion, address, city, photoUrl,
    emergencyContactName, emergencyContactPhone, emergencyContactRelation,
    previousSchoolName, previousSchoolAddress, previousGrade, medicalNotes,
    sectionId, academicYearId, rollNumber,
    guardians,
  } = parsed.data;

  if (email) {
    const existing = await prisma.student.findFirst({ where: { email, deletedAt: null } });
    if (existing) return failure("A student with this email already exists", 409);

    const existingUser = await prisma.user.findFirst({ where: { email, deletedAt: null } });
    if (existingUser) return failure("This email is already used by another portal account", 409);
  }

  const registrationNumber = await generateStudentRegistrationNumber();

  const { student, credentials } = await prisma.$transaction(async (tx) => {
    const s = await tx.student.create({
      data: {
        registrationNumber,
        firstName,
        lastName,
        email: email || null,
        phone,
        status,
        createdById: guard.payload!.sub,
        profile: {
          create: {
            dateOfBirth, gender, bloodGroup, nationality, religion, address, city, photoUrl,
            emergencyContactName, emergencyContactPhone, emergencyContactRelation,
            previousSchoolName, previousSchoolAddress, previousGrade, medicalNotes,
          },
        },
        history: {
          create: { event: "ADMISSION", toValue: status, remarks: "Student admitted", recordedById: guard.payload!.sub },
        },
      },
    });

    if (sectionId && academicYearId) {
      await tx.studentEnrollment.create({
        data: { studentId: s.id, sectionId, academicYearId, rollNumber },
      });
    }

    const generatedCredentials: GeneratedCredential[] = [];

    // Every student gets their own portal login automatically — using their
    // own email if one was provided, otherwise a synthetic one built from
    // their registration number (schools frequently don't have real email
    // addresses on file for younger students).
    const studentLoginEmail = email || (await buildSyntheticEmail(registrationNumber, "student.portal"));
    const { user: studentUser, temporaryPassword: studentPassword } = await createPortalAccount({
      tx,
      firstName,
      lastName,
      email: studentLoginEmail,
      roleSlug: "student",
      createdById: guard.payload!.sub,
    });
    await tx.student.update({ where: { id: s.id }, data: { userId: studentUser.id } });
    generatedCredentials.push({
      forName: `${firstName} ${lastName} (student)`,
      role: "student",
      email: studentUser.email,
      temporaryPassword: studentPassword,
    });

    // Each guardian with an email gets linked to (or gets created) a parent
    // portal account, scoped to only this child via Guardian.userId.
    if (guardians?.length) {
      const { credentials: guardianCredentials } = await syncStudentGuardians(tx, s.id, guardians, guard.payload!.sub);
      generatedCredentials.push(...guardianCredentials);
    }

    return { student: s, credentials: generatedCredentials };
  });

  await logAudit({
    userId: guard.payload!.sub,
    action: "CREATE",
    entityType: "Student",
    entityId: student.id,
    newValues: { registrationNumber, firstName, lastName },
    ipAddress,
    userAgent,
  });
  await logActivity({
    userId: guard.payload!.sub,
    type: "STUDENT",
    description: `New student admitted: ${student.firstName} ${student.lastName} (${registrationNumber})`,
  });

  // Temporary passwords are returned exactly once, here — they are never
  // retrievable again after this response (only their bcrypt hash exists
  // from this point on). The frontend must show these to the admin now.
  return created({ id: student.id, registrationNumber: student.registrationNumber, credentials });
}
