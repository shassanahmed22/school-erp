import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { createInventoryCategorySchema } from "@/lib/validators/inventory-category.validator";
import { success, created, failure } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function GET() {
  const guard = await requirePermission("inventory-categories.view");
  if (guard.error) return guard.error;

  const categories = await prisma.inventoryCategory.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    include: { _count: { select: { items: true } } },
  });

  return success(
    categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      itemCount: c._count.items,
    }))
  );
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("inventory-categories.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = createInventoryCategorySchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.inventoryCategory.findUnique({ where: { name: parsed.data.name } });
  if (existing) return failure("A category with this name already exists", 409);

  const category = await prisma.inventoryCategory.create({ data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "CREATE", entityType: "InventoryCategory", entityId: category.id, newValues: parsed.data, ipAddress, userAgent });

  return created(category);
}
