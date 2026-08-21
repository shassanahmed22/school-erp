import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { createBookSchema, bookQuerySchema } from "@/lib/validators/book.validator";
import { paginated, created, failure } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const guard = await requirePermission("books.view");
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const parsed = bookQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return failure("Invalid query parameters", 422, parsed.error.flatten());

  const { page, limit, search, categoryId, availableOnly } = parsed.data;

  const where = {
    deletedAt: null,
    ...(categoryId && { categoryId }),
    ...(availableOnly && { availableQuantity: { gt: 0 } }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" as const } },
        { author: { contains: search, mode: "insensitive" as const } },
        { isbn: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.book.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { title: "asc" },
      include: { category: { select: { name: true } } },
    }),
    prisma.book.count({ where }),
  ]);

  const data = items.map((b) => ({
    id: b.id,
    categoryId: b.categoryId,
    categoryName: b.category.name,
    title: b.title,
    author: b.author,
    isbn: b.isbn,
    publisher: b.publisher,
    quantity: b.quantity,
    availableQuantity: b.availableQuantity,
    shelfLocation: b.shelfLocation,
  }));

  return paginated(data, { page, limit, total });
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("books.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = createBookSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  if (parsed.data.isbn) {
    const existing = await prisma.book.findUnique({ where: { isbn: parsed.data.isbn } });
    if (existing) return failure("A book with this ISBN already exists", 409);
  }

  const book = await prisma.book.create({
    data: { ...parsed.data, availableQuantity: parsed.data.quantity, createdById: guard.payload!.sub },
  });

  await logAudit({ userId: guard.payload!.sub, action: "CREATE", entityType: "Book", entityId: book.id, newValues: { title: book.title, author: book.author }, ipAddress, userAgent });
  await logActivity({ userId: guard.payload!.sub, type: "LIBRARY", description: `Added book: ${book.title}` });

  return created(book);
}
