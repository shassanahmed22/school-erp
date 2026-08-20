import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { updateInventoryCategorySchema } from "@/lib/validators/inventory-category.validator";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("inventory-categories.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateInventoryCategorySchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.inventoryCategory.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Category not found");

  if (parsed.data.name && parsed.data.name !== existing.name) {
    const nameTaken = await prisma.inventoryCategory.findUnique({ where: { name: parsed.data.name } });
    if (nameTaken) return failure("A category with this name already exists", 409);
  }

  const category = await prisma.inventoryCategory.update({ where: { id: params.id }, data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "InventoryCategory", entityId: category.id, newValues: parsed.data, ipAddress, userAgent });

  return success(category);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("inventory-categories.delete");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.inventoryCategory.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Category not found");

  const inUse = await prisma.inventoryItem.count({ where: { categoryId: params.id, deletedAt: null } });
  if (inUse > 0) return failure("Cannot delete a category that still has items in it", 409);

  await prisma.inventoryCategory.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  await logAudit({ userId: guard.payload!.sub, action: "DELETE", entityType: "InventoryCategory", entityId: params.id, ipAddress, userAgent });

  return success(null, "Category deleted successfully");
}
