import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { updateFeeCategorySchema } from "@/lib/validators/fee-category.validator";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("fee-categories.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateFeeCategorySchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.feeCategory.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Fee category not found");

  const category = await prisma.feeCategory.update({ where: { id: params.id }, data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "FeeCategory", entityId: category.id, newValues: parsed.data, ipAddress, userAgent });

  return success(category);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("fee-categories.delete");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.feeCategory.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Fee category not found");

  const inUse = await prisma.feeStructure.count({ where: { feeCategoryId: params.id, deletedAt: null } });
  if (inUse > 0) return failure("Cannot delete a category that has fee structures assigned to it", 409);

  await prisma.feeCategory.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  await logAudit({ userId: guard.payload!.sub, action: "DELETE", entityType: "FeeCategory", entityId: params.id, ipAddress, userAgent });

  return success(null, "Fee category deleted successfully");
}
