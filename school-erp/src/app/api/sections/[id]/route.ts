import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { updateSectionSchema } from "@/lib/validators/academic.validator";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("sections.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateSectionSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.section.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Section not found");

  const { classTeacherId, ...rest } = parsed.data;

  const section = await prisma.$transaction(async (tx) => {
    if (classTeacherId !== undefined) {
      await tx.classTeacher.deleteMany({ where: { sectionId: params.id } });
      if (classTeacherId) {
        await tx.classTeacher.create({ data: { sectionId: params.id, teacherId: classTeacherId } });
      }
    }
    return tx.section.update({ where: { id: params.id }, data: rest });
  });

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "Section", entityId: section.id, newValues: parsed.data, ipAddress, userAgent });

  return success(section);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("sections.delete");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.section.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Section not found");

  const activeEnrollments = await prisma.studentEnrollment.count({ where: { sectionId: params.id, status: "ACTIVE" } });
  if (activeEnrollments > 0) return failure("Cannot delete a section with actively enrolled students", 409);

  await prisma.section.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  await logAudit({ userId: guard.payload!.sub, action: "DELETE", entityType: "Section", entityId: params.id, ipAddress, userAgent });

  return success(null, "Section deleted successfully");
}
