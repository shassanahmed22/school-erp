import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { updateScholarshipSchema } from "@/lib/validators/scholarship.validator";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("scholarships.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateScholarshipSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.scholarship.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Scholarship not found");

  const scholarship = await prisma.scholarship.update({ where: { id: params.id }, data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "Scholarship", entityId: scholarship.id, newValues: parsed.data, ipAddress, userAgent });

  return success(scholarship);
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("scholarships.delete");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.scholarship.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Scholarship not found");

  await prisma.scholarship.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  await logAudit({ userId: guard.payload!.sub, action: "DELETE", entityType: "Scholarship", entityId: params.id, ipAddress, userAgent });

  return success(null, "Scholarship deleted successfully");
}
