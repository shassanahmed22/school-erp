import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { success } from "@/lib/api-response";

export async function GET() {
  const guard = await requirePermission("inventory-items.view");
  if (guard.error) return guard.error;

  const [totalItems, totalCategories, allItems, recentTransactions] = await Promise.all([
    prisma.inventoryItem.count({ where: { deletedAt: null } }),
    prisma.inventoryCategory.count({ where: { deletedAt: null } }),
    prisma.inventoryItem.findMany({
      where: { deletedAt: null },
      select: { quantity: true, reorderLevel: true, unitPrice: true, name: true, unit: true },
    }),
    prisma.inventoryTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { item: { select: { name: true, unit: true } } },
    }),
  ]);

  const totalStockValue = allItems.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);
  const lowStockItems = allItems.filter((i) => i.quantity <= i.reorderLevel);

  return success({
    totalItems,
    totalCategories,
    totalStockValue,
    lowStockCount: lowStockItems.length,
    lowStockItems: lowStockItems.slice(0, 8).map((i) => ({ name: i.name, quantity: i.quantity, reorderLevel: i.reorderLevel, unit: i.unit })),
    recentTransactions: recentTransactions.map((t) => ({
      id: t.id,
      itemName: t.item.name,
      unit: t.item.unit,
      type: t.type,
      quantity: t.quantity,
      createdAt: t.createdAt,
    })),
  });
}
