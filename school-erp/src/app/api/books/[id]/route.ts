import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { updateBookSchema } from "@/lib/validators/book.validator";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("books.view");
  if (guard.error) return guard.error;

  const book = await prisma.book.findFirst({
    where: { id: params.id, deletedAt: null },
    include: { category: true, issues: { where: { status: { in: ["ISSUED", "OVERDUE"] } }, include: { student: { select: { firstName: true, lastName: true, registrationNumber: true } } } } },
  });
  if (!book) return notFound("Book not found");

  return success(book);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("books.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateBookSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.book.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Book not found");

  const { quantity, ...rest } = parsed.data;
  let availableQuantity: number | undefined;

  if (quantity !== undefined) {
    const issuedCount = existing.quantity - existing.availableQuantity;
    if (quantity < issuedCount) {
      return failure(`Cannot reduce quantity below the ${issuedCount} cop${issuedCount === 1 ? "y" : "ies"} currently issued`, 422);
    }
    availableQuantity = quantity - issuedCount;
  }

  const book = await prisma.book.update({
    where: { id: params.id },
    data: { ...rest, ...(quantity !== undefined && { quantity, availableQuantity }) },
  });

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "Book", entityId: book.id, newValues: parsed.data, ipAddress, userAgent });

  return success(book);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("books.delete");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.book.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Book not found");

  const activeIssues = await prisma.bookIssue.count({ where: { bookId: params.id, status: { in: ["ISSUED", "OVERDUE"] } } });
  if (activeIssues > 0) return failure("Cannot delete a book with copies currently issued", 409);

  await prisma.book.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  await logAudit({ userId: guard.payload!.sub, action: "DELETE", entityType: "Book", entityId: params.id, ipAddress, userAgent });

  return success(null, "Book deleted successfully");
}
