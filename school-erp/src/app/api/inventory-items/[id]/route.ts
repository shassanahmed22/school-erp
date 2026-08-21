import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { updateInventoryItemSchema } from "@/lib/validators/inventory-item.validator";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("inventory-items.view");
  if (guard.error) return guard.error;

  const item = await prisma.inventoryItem.findFirst({
    where: { id: params.id, deletedAt: null },
    include: {
      category: { select: { name: true } },
      transactions: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!item) return notFound("Item not found");

  return success(item);
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("inventory-items.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateInventoryItemSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.inventoryItem.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Item not found");

  if (parsed.data.sku && parsed.data.sku !== existing.sku) {
    const skuTaken = await prisma.inventoryItem.findUnique({ where: { sku: parsed.data.sku } });
    if (skuTaken) return failure("An item with this SKU already exists", 409);
  }

  if (parsed.data.categoryId) {
    const category = await prisma.inventoryCategory.findFirst({ where: { id: parsed.data.categoryId, deletedAt: null } });
    if (!category) return failure("Selected category does not exist", 422);
  }

  const item = await prisma.inventoryItem.update({ where: { id: params.id }, data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "InventoryItem", entityId: item.id, newValues: parsed.data, ipAddress, userAgent });

  return success(item);
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("inventory-items.delete");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.inventoryItem.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Item not found");

  await prisma.inventoryItem.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  await logAudit({ userId: guard.payload!.sub, action: "DELETE", entityType: "InventoryItem", entityId: params.id, ipAddress, userAgent });

  return success(null, "Item deleted successfully");
}
