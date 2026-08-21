import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { createInventoryItemSchema } from "@/lib/validators/inventory-item.validator";
import { success, created, failure } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const guard = await requirePermission("inventory-items.view");
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || undefined;
  const categoryId = searchParams.get("categoryId") || undefined;
  const lowStockOnly = searchParams.get("lowStockOnly") === "true";

  const items = await prisma.inventoryItem.findMany({
    where: {
      deletedAt: null,
      ...(categoryId && { categoryId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { sku: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    },
    orderBy: { name: "asc" },
    take: 300, // safety cap — search/category filters keep normal browsing well under this
    include: { category: { select: { name: true } } },
  });

  const data = items
    .map((i) => ({
      id: i.id,
      name: i.name,
      sku: i.sku,
      categoryId: i.categoryId,
      categoryName: i.category.name,
      unit: i.unit,
      quantity: i.quantity,
      reorderLevel: i.reorderLevel,
      unitPrice: i.unitPrice,
      totalValue: Number(i.unitPrice) * i.quantity,
      supplier: i.supplier,
      location: i.location,
      status: i.status,
      isLowStock: i.quantity <= i.reorderLevel,
    }))
    .filter((i) => !lowStockOnly || i.isLowStock);

  return success(data);
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("inventory-items.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = createInventoryItemSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const category = await prisma.inventoryCategory.findFirst({ where: { id: parsed.data.categoryId, deletedAt: null } });
  if (!category) return failure("Selected category does not exist", 422);

  if (parsed.data.sku) {
    const existing = await prisma.inventoryItem.findUnique({ where: { sku: parsed.data.sku } });
    if (existing) return failure("An item with this SKU already exists", 409);
  }

  const item = await prisma.$transaction(async (tx) => {
    const newItem = await tx.inventoryItem.create({ data: parsed.data });
    if (newItem.quantity > 0) {
      await tx.inventoryTransaction.create({
        data: {
          itemId: newItem.id,
          type: "STOCK_IN",
          quantity: newItem.quantity,
          reason: "Initial stock on item creation",
          performedById: guard.payload!.sub,
        },
      });
    }
    return newItem;
  });

  await logAudit({ userId: guard.payload!.sub, action: "CREATE", entityType: "InventoryItem", entityId: item.id, newValues: parsed.data, ipAddress, userAgent });

  return created(item);
}
