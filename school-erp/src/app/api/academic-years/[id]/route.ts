import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";

import { requirePermission } from "@/lib/api-guard";

import { updateAcademicYearSchema } from "@/lib/validators/academic.validator";

import { success, failure, notFound } from "@/lib/api-response";

import { logAudit, getRequestMeta } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const guard = await requirePermission("academic-years.edit");

  if (guard.error) return guard.error;

  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();

  const parsed = updateAcademicYearSchema.safeParse(body);

  if (!parsed.success) {
    return failure("Validation failed", 422, parsed.error.flatten());
  }

  const existing = await prisma.academicYear.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) return notFound("Academic year not found");

  const year = await prisma.$transaction(async (tx) => {
    if (parsed.data.isCurrent) {
      await tx.academicYear.updateMany({
        where: {
          isCurrent: true,
          id: { not: id },
        },
        data: { isCurrent: false },
      });
    }

    return tx.academicYear.update({
      where: { id },
      data: parsed.data,
    });
  });

  await logAudit({
    userId: guard.payload!.sub,
    action: "UPDATE",
    entityType: "AcademicYear",
    entityId: year.id,
    newValues: parsed.data,
    ipAddress,
    userAgent,
  });

  return success(year);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const guard = await requirePermission("academic-years.delete");

  if (guard.error) return guard.error;

  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.academicYear.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) return notFound("Academic year not found");

  await prisma.academicYear.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await logAudit({
    userId: guard.payload!.sub,
    action: "DELETE",
    entityType: "AcademicYear",
    entityId: id,
    ipAddress,
    userAgent,
  });

  return success(null, "Academic year deleted successfully");
}