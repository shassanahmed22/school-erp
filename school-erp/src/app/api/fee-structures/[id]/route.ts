import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { updateFeeStructureSchema } from "@/lib/validators/fee-structure.validator";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("fee-structures.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateFeeStructureSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.feeStructure.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Fee structure not found");

  const structure = await prisma.feeStructure.update({ where: { id: params.id }, data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "FeeStructure", entityId: structure.id, newValues: parsed.data, ipAddress, userAgent });

  return success(structure);
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("fee-structures.delete");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.feeStructure.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Fee structure not found");

  const inUse = await prisma.studentFee.count({ where: { feeStructureId: params.id } });
  if (inUse > 0) return failure("Cannot delete a fee structure that has been assigned to students", 409);

  await prisma.feeStructure.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  await logAudit({ userId: guard.payload!.sub, action: "DELETE", entityType: "FeeStructure", entityId: params.id, ipAddress, userAgent });

  return success(null, "Fee structure deleted successfully");
}
