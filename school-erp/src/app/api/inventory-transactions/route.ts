import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { createInventoryTransactionSchema } from "@/lib/validators/inventory-transaction.validator";
import { success, created, failure, notFound } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const guard = await requirePermission("inventory-transactions.view");
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId") || undefined;

  const transactions = await prisma.inventoryTransaction.findMany({
    where: { ...(itemId && { itemId }) },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { item: { select: { name: true, unit: true } } },
  });

  return success(
    transactions.map((t) => ({
      id: t.id,
      itemId: t.itemId,
      itemName: t.item.name,
      unit: t.item.unit,
      type: t.type,
      quantity: t.quantity,
      reason: t.reason,
      createdAt: t.createdAt,
    }))
  );
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("inventory-transactions.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = createInventoryTransactionSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const item = await prisma.inventoryItem.findFirst({ where: { id: parsed.data.itemId, deletedAt: null } });
  if (!item) return notFound("Item not found");

  const { type, quantity, reason } = parsed.data;

  if (type === "STOCK_OUT" && quantity > item.quantity) {
    return failure(`Cannot remove ${quantity} ${item.unit.toLowerCase()} — only ${item.quantity} in stock`, 409);
  }

  const quantityChange = type === "STOCK_OUT" ? -quantity : quantity;

  const transaction = await prisma.$transaction(async (tx) => {
    const tx_ = await tx.inventoryTransaction.create({
      data: { itemId: item.id, type, quantity, reason, performedById: guard.payload!.sub },
    });
    await tx.inventoryItem.update({
      where: { id: item.id },
      data: { quantity: { increment: quantityChange } },
    });
    return tx_;
  });

  await logAudit({ userId: guard.payload!.sub, action: "CREATE", entityType: "InventoryTransaction", entityId: transaction.id, newValues: parsed.data, ipAddress, userAgent });
  await logActivity({
    userId: guard.payload!.sub,
    type: "INVENTORY",
    description: `${type.replace("_", " ").toLowerCase()} of ${quantity} ${item.unit.toLowerCase()} for "${item.name}"`,
  });

  return created(transaction);
}
