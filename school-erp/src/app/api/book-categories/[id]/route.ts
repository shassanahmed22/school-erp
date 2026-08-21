import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { updateBookCategorySchema } from "@/lib/validators/book-category.validator";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("books.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateBookCategorySchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.bookCategory.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Category not found");

  const category = await prisma.bookCategory.update({ where: { id: params.id }, data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "BookCategory", entityId: category.id, newValues: parsed.data, ipAddress, userAgent });

  return success(category);
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("books.delete");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.bookCategory.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Category not found");

  const inUse = await prisma.book.count({ where: { categoryId: params.id, deletedAt: null } });
  if (inUse > 0) return failure("Cannot delete a category that has books assigned", 409);

  await prisma.bookCategory.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  await logAudit({ userId: guard.payload!.sub, action: "DELETE", entityType: "BookCategory", entityId: params.id, ipAddress, userAgent });

  return success(null, "Category deleted successfully");
}
