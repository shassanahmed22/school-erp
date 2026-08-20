import { prisma } from "./prisma";

/** Fine rate applied per day overdue. Adjust here to change school-wide policy. */
const FINE_PER_DAY = 5;
const MAX_FINE_CAP = 500;

export function calculateFine(dueDate: Date, returnDate: Date = new Date()): number {
  const due = new Date(dueDate);
  const returned = new Date(returnDate);
  due.setHours(0, 0, 0, 0);
  returned.setHours(0, 0, 0, 0);

  const overdueDays = Math.max(0, Math.floor((returned.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
  return Math.min(overdueDays * FINE_PER_DAY, MAX_FINE_CAP);
}

/** Flags any ISSUED book-issue past its due date as OVERDUE and recalculates its running fine. */
export async function markOverdueIssues() {
  const overdueIssues = await prisma.bookIssue.findMany({
    where: { status: "ISSUED", dueDate: { lt: new Date() } },
  });

  let updated = 0;
  for (const issue of overdueIssues) {
    const fineAmount = calculateFine(issue.dueDate);
    await prisma.bookIssue.update({
      where: { id: issue.id },
      data: { status: "OVERDUE", fineAmount },
    });
    updated++;
  }
  return updated;
}

export interface LibrarySummary {
  totalBooks: number;
  totalCopies: number;
  issuedCount: number;
  overdueCount: number;
}

export async function computeLibrarySummary(): Promise<LibrarySummary> {
  await markOverdueIssues();

  const [totalBooks, quantityAgg, issuedCount, overdueCount] = await Promise.all([
    prisma.book.count({ where: { deletedAt: null } }),
    prisma.book.aggregate({ _sum: { quantity: true }, where: { deletedAt: null } }),
    prisma.bookIssue.count({ where: { status: "ISSUED" } }),
    prisma.bookIssue.count({ where: { status: "OVERDUE" } }),
  ]);

  return {
    totalBooks,
    totalCopies: quantityAgg._sum.quantity ?? 0,
    issuedCount,
    overdueCount,
  };
}
