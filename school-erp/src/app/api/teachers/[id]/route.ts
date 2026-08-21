import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { updateTeacherSchema } from "@/lib/validators/teacher.validator";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("teachers.view");
  if (guard.error) return guard.error;

  const teacher = await prisma.teacher.findFirst({
    where: { id: params.id, deletedAt: null },
    include: {
      profile: true,
      qualifications: { orderBy: { yearCompleted: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
      classTeacherOf: { include: { section: { include: { class: true } } } },
      teacherSubjects: { include: { subject: true } },
    },
  });

  if (!teacher) return notFound("Teacher not found");

  return success(teacher);
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("teachers.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateTeacherSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.teacher.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Teacher not found");

  const {
    firstName, lastName, email, phone, designation, status,
    dateOfBirth, gender, bloodGroup, nationality, address, city, photoUrl, cnic,
    experienceYears, specialization, emergencyContactName, emergencyContactPhone,
    qualifications, subjectIds,
  } = parsed.data;

  const teacher = await prisma.$transaction(async (tx) => {
    const t = await tx.teacher.update({
      where: { id: params.id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(designation !== undefined && { designation }),
        ...(status !== undefined && { status }),
        profile: {
          upsert: {
            create: {
              dateOfBirth, gender, bloodGroup, nationality, address, city, photoUrl, cnic,
              experienceYears, specialization, emergencyContactName, emergencyContactPhone,
            },
            update: {
              ...(dateOfBirth !== undefined && { dateOfBirth }),
              ...(gender !== undefined && { gender }),
              ...(bloodGroup !== undefined && { bloodGroup }),
              ...(nationality !== undefined && { nationality }),
              ...(address !== undefined && { address }),
              ...(city !== undefined && { city }),
              ...(photoUrl !== undefined && { photoUrl }),
              ...(cnic !== undefined && { cnic }),
              ...(experienceYears !== undefined && { experienceYears }),
              ...(specialization !== undefined && { specialization }),
              ...(emergencyContactName !== undefined && { emergencyContactName }),
              ...(emergencyContactPhone !== undefined && { emergencyContactPhone }),
            },
          },
        },
      },
    });

    if (qualifications) {
      await tx.teacherQualification.deleteMany({ where: { teacherId: params.id } });
      if (qualifications.length > 0) {
        await tx.teacherQualification.createMany({ data: qualifications.map((q) => ({ ...q, teacherId: params.id })) });
      }
    }

    if (subjectIds) {
      await tx.teacherSubject.deleteMany({ where: { teacherId: params.id } });
      if (subjectIds.length > 0) {
        await tx.teacherSubject.createMany({ data: subjectIds.map((subjectId) => ({ teacherId: params.id, subjectId })) });
      }
    }

    return t;
  });

  await logAudit({
    userId: guard.payload!.sub,
    action: "UPDATE",
    entityType: "Teacher",
    entityId: teacher.id,
    newValues: parsed.data,
    ipAddress,
    userAgent,
  });
  await logActivity({ userId: guard.payload!.sub, type: "TEACHER", description: `Updated teacher: ${teacher.firstName} ${teacher.lastName}` });

  return success({ id: teacher.id });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("teachers.delete");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.teacher.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Teacher not found");

  await prisma.teacher.update({ where: { id: params.id }, data: { deletedAt: new Date() } });

  await logAudit({ userId: guard.payload!.sub, action: "DELETE", entityType: "Teacher", entityId: params.id, oldValues: { employeeCode: existing.employeeCode }, ipAddress, userAgent });
  await logActivity({ userId: guard.payload!.sub, type: "TEACHER", description: `Removed teacher: ${existing.firstName} ${existing.lastName}` });

  return success(null, "Teacher deleted successfully");
}
