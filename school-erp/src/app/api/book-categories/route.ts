import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { createBookCategorySchema } from "@/lib/validators/book-category.validator";
import { success, created, failure } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function GET() {
  const guard = await requirePermission("books.view");
  if (guard.error) return guard.error;

  const categories = await prisma.bookCategory.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    include: { _count: { select: { books: { where: { deletedAt: null } } } } },
  });

  return success(categories.map((c) => ({ id: c.id, name: c.name, description: c.description, bookCount: c._count.books })));
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("books.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = createBookCategorySchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.bookCategory.findUnique({ where: { name: parsed.data.name } });
  if (existing) return failure("A category with this name already exists", 409);

  const category = await prisma.bookCategory.create({ data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "CREATE", entityType: "BookCategory", entityId: category.id, newValues: parsed.data, ipAddress, userAgent });

  return created(category);
}
