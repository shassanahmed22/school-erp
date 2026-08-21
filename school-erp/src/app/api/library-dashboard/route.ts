import { requirePermission } from "@/lib/api-guard";
import { computeLibrarySummary } from "@/lib/library-service";
import { prisma } from "@/lib/prisma";
import { success } from "@/lib/api-response";

export async function GET() {
  const guard = await requirePermission("books.view");
  if (guard.error) return guard.error;

  const [summary, overdueIssues] = await Promise.all([
    computeLibrarySummary(),
    prisma.bookIssue.findMany({
      where: { status: "OVERDUE" },
      take: 8,
      orderBy: { dueDate: "asc" },
      include: { book: { select: { title: true } }, student: { select: { firstName: true, lastName: true, registrationNumber: true } } },
    }),
  ]);

  return success({
    ...summary,
    overdueList: overdueIssues.map((i) => ({
      id: i.id,
      bookTitle: i.book.title,
      studentName: `${i.student.firstName} ${i.student.lastName}`,
      registrationNumber: i.student.registrationNumber,
      dueDate: i.dueDate,
      fineAmount: Number(i.fineAmount),
    })),
  });
}
