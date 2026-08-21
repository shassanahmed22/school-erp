import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { updateStudentSchema } from "@/lib/validators/student.validator";
import { syncStudentGuardians } from "@/lib/guardian-service";
import { type GeneratedCredential } from "@/lib/credentials";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("students.view");
  if (guard.error) return guard.error;

  const student = await prisma.student.findFirst({
    where: { id: params.id, deletedAt: null },
    include: {
      profile: true,
      guardians: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
      documents: { orderBy: { createdAt: "desc" } },
      history: { orderBy: { createdAt: "desc" }, take: 20 },
      enrollments: {
        orderBy: { enrolledAt: "desc" },
        include: {
          section: { include: { class: true } },
          academicYear: { select: { name: true } },
        },
      },
    },
  });

  if (!student) return notFound("Student not found");

  return success(student);
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("students.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateStudentSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.student.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Student not found");

  const {
    firstName, lastName, email, phone, status,
    dateOfBirth, gender, bloodGroup, nationality, religion, address, city, photoUrl,
    emergencyContactName, emergencyContactPhone, emergencyContactRelation,
    previousSchoolName, previousSchoolAddress, previousGrade, medicalNotes,
    guardians,
  } = parsed.data;

  const { student, credentials } = await prisma.$transaction(async (tx) => {
    const s = await tx.student.update({
      where: { id: params.id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email: email || null }),
        ...(phone !== undefined && { phone }),
        ...(status !== undefined && { status }),
        profile: {
          upsert: {
            create: {
              dateOfBirth, gender, bloodGroup, nationality, religion, address, city, photoUrl,
              emergencyContactName, emergencyContactPhone, emergencyContactRelation,
              previousSchoolName, previousSchoolAddress, previousGrade, medicalNotes,
            },
            update: {
              ...(dateOfBirth !== undefined && { dateOfBirth }),
              ...(gender !== undefined && { gender }),
              ...(bloodGroup !== undefined && { bloodGroup }),
              ...(nationality !== undefined && { nationality }),
              ...(religion !== undefined && { religion }),
              ...(address !== undefined && { address }),
              ...(city !== undefined && { city }),
              ...(photoUrl !== undefined && { photoUrl }),
              ...(emergencyContactName !== undefined && { emergencyContactName }),
              ...(emergencyContactPhone !== undefined && { emergencyContactPhone }),
              ...(emergencyContactRelation !== undefined && { emergencyContactRelation }),
              ...(previousSchoolName !== undefined && { previousSchoolName }),
              ...(previousSchoolAddress !== undefined && { previousSchoolAddress }),
              ...(previousGrade !== undefined && { previousGrade }),
              ...(medicalNotes !== undefined && { medicalNotes }),
            },
          },
        },
      },
    });

    let syncedCredentials: GeneratedCredential[] = [];
    if (guardians) {
      // Reconciles by phone number and preserves each guardian's linked
      // parent-portal account instead of destroying it — see guardian-service.ts.
      const result = await syncStudentGuardians(tx, params.id, guardians, guard.payload!.sub);
      syncedCredentials = result.credentials;
    }

    return { student: s, credentials: syncedCredentials };
  });

  await logAudit({
    userId: guard.payload!.sub,
    action: "UPDATE",
    entityType: "Student",
    entityId: student.id,
    newValues: parsed.data,
    ipAddress,
    userAgent,
  });
  await logActivity({ userId: guard.payload!.sub, type: "STUDENT", description: `Updated student: ${student.firstName} ${student.lastName}` });

  return success({ id: student.id, credentials });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("students.delete");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.student.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Student not found");

  await prisma.student.update({ where: { id: params.id }, data: { deletedAt: new Date() } });

  await logAudit({ userId: guard.payload!.sub, action: "DELETE", entityType: "Student", entityId: params.id, oldValues: { registrationNumber: existing.registrationNumber }, ipAddress, userAgent });
  await logActivity({ userId: guard.payload!.sub, type: "STUDENT", description: `Removed student: ${existing.firstName} ${existing.lastName}` });

  return success(null, "Student deleted successfully");
}
