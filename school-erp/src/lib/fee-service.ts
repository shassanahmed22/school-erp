import { prisma } from "./prisma";

/** Generates a sequential receipt number scoped to the current year, e.g. RCPT-2026-00001. */
export async function generateReceiptNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `RCPT-${year}-`;
  const count = await prisma.feePayment.count({ where: { receiptNumber: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(5, "0")}`;
}

/** Resolves a StudentFee's status from its payments + due date. Call after any payment change. */
export async function recomputeStudentFeeStatus(studentFeeId: string) {
  const studentFee = await prisma.studentFee.findUnique({
    where: { id: studentFeeId },
    include: { payments: true },
  });
  if (!studentFee) return null;
  if (studentFee.status === "WAIVED") return studentFee; // waived fees are never auto-recomputed

  const totalPaid = studentFee.payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
  const finalAmount = Number(studentFee.finalAmount);

  let status: "PENDING" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" = "PENDING";
  if (totalPaid >= finalAmount && finalAmount > 0) {
    status = "PAID";
  } else if (totalPaid > 0) {
    status = "PARTIALLY_PAID";
  } else if (new Date(studentFee.dueDate) < new Date()) {
    status = "OVERDUE";
  } else {
    status = "PENDING";
  }

  return prisma.studentFee.update({ where: { id: studentFeeId }, data: { status } });
}

/** Applies a student's active scholarship(s) to a base amount, returning the discount value. */
export async function computeScholarshipDiscount(studentId: string, baseAmount: number): Promise<number> {
  const scholarships = await prisma.studentScholarship.findMany({
    where: { studentId, scholarship: { status: "ACTIVE", deletedAt: null } },
    include: { scholarship: true },
  });

  let discount = 0;
  for (const s of scholarships) {
    if (s.scholarship.type === "PERCENTAGE") {
      discount += (baseAmount * Number(s.scholarship.value)) / 100;
    } else {
      discount += Number(s.scholarship.value);
    }
  }
  return Math.min(discount, baseAmount);
}

/** Marks any PENDING student fees past their due date as OVERDUE. Safe to call frequently (e.g. on dashboard load). */
export async function markOverdueFees() {
  const { count } = await prisma.studentFee.updateMany({
    where: { status: "PENDING", dueDate: { lt: new Date() } },
    data: { status: "OVERDUE" },
  });
  return count;
}

export interface FinanceSummary {
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  monthlyCollection: number;
}

/** Computes school-wide (or class-scoped) collection totals for the finance dashboard. */
export async function computeFinanceSummary(classId?: string): Promise<FinanceSummary> {
  await markOverdueFees();

  const studentFeeWhere = classId ? { feeStructure: { classId } } : {};

  const [paidAgg, pendingAgg, overdueAgg, monthlyAgg] = await Promise.all([
    prisma.feePayment.aggregate({
      _sum: { amountPaid: true },
      where: classId ? { studentFee: { feeStructure: { classId } } } : {},
    }),
    prisma.studentFee.aggregate({
      _sum: { finalAmount: true },
      where: { ...studentFeeWhere, status: { in: ["PENDING", "PARTIALLY_PAID"] } },
    }),
    prisma.studentFee.aggregate({
      _sum: { finalAmount: true },
      where: { ...studentFeeWhere, status: "OVERDUE" },
    }),
    prisma.feePayment.aggregate({
      _sum: { amountPaid: true },
      where: {
        paymentDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        ...(classId ? { studentFee: { feeStructure: { classId } } } : {}),
      },
    }),
  ]);

  return {
    totalCollected: Number(paidAgg._sum.amountPaid ?? 0),
    totalPending: Number(pendingAgg._sum.finalAmount ?? 0),
    totalOverdue: Number(overdueAgg._sum.finalAmount ?? 0),
    monthlyCollection: Number(monthlyAgg._sum.amountPaid ?? 0),
  };
}
