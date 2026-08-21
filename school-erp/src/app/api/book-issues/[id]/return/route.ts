import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { returnBookSchema } from "@/lib/validators/book-issue.validator";
import { calculateFine } from "@/lib/library-service";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("books.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json().catch(() => ({}));
  const parsed = returnBookSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const issue = await prisma.bookIssue.findUnique({ where: { id: params.id }, include: { book: true, student: true } });
  if (!issue) return notFound("Book issue not found");
  if (issue.status === "RETURNED") return failure("This book has already been returned", 409);

  const { returnDate, remarks } = parsed.data;
  const fineAmount = calculateFine(issue.dueDate, returnDate);

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.bookIssue.update({
      where: { id: params.id },
      data: {
        status: "RETURNED",
        returnDate,
        fineAmount,
        remarks,
        returnedById: guard.payload!.sub,
      },
    });
    await tx.book.update({ where: { id: issue.bookId }, data: { availableQuantity: { increment: 1 } } });
    return result;
  });

  await logAudit({
    userId: guard.payload!.sub,
    action: "UPDATE",
    entityType: "BookIssue",
    entityId: updated.id,
    newValues: { status: "RETURNED", fineAmount },
    ipAddress,
    userAgent,
  });
  await logActivity({
    userId: guard.payload!.sub,
    type: "LIBRARY",
    description: `"${issue.book.title}" returned by ${issue.student.firstName} ${issue.student.lastName}${fineAmount > 0 ? ` (fine: Rs. ${fineAmount})` : ""}`,
  });

  return success(updated, fineAmount > 0 ? `Book returned. Fine of Rs. ${fineAmount} applies.` : "Book returned successfully");
}
