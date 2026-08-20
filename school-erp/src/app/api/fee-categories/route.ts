import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { createFeeCategorySchema } from "@/lib/validators/fee-category.validator";
import { success, created, failure } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function GET() {
  const guard = await requirePermission("fee-categories.view");
  if (guard.error) return guard.error;

  const categories = await prisma.feeCategory.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    include: { _count: { select: { feeStructures: true } } },
  });

  return success(
    categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      status: c.status,
      structureCount: c._count.feeStructures,
    }))
  );
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("fee-categories.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = createFeeCategorySchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.feeCategory.findUnique({ where: { name: parsed.data.name } });
  if (existing) return failure("A fee category with this name already exists", 409);

  const category = await prisma.feeCategory.create({ data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "CREATE", entityType: "FeeCategory", entityId: category.id, newValues: parsed.data, ipAddress, userAgent });
  await logActivity({ userId: guard.payload!.sub, type: "FEE", description: `Created fee category: ${category.name}` });

  return created(category);
}
