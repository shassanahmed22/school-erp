import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { computeFinanceSummary } from "@/lib/fee-service";
import { success } from "@/lib/api-response";

export async function GET() {
  const guard = await requirePermission("fee-payments.view");
  if (guard.error) return guard.error;

  const [summary, recentPayments, statusBreakdown] = await Promise.all([
    computeFinanceSummary(),
    prisma.feePayment.findMany({
      orderBy: { paymentDate: "desc" },
      take: 8,
      include: {
        studentFee: {
          include: {
            student: { select: { firstName: true, lastName: true, registrationNumber: true } },
            feeStructure: { include: { feeCategory: { select: { name: true } } } },
          },
        },
      },
    }),
    prisma.studentFee.groupBy({ by: ["status"], _sum: { finalAmount: true }, _count: true }),
  ]);

  // Last 6 months collection trend
  const now = new Date();
  const monthlyTrend = await Promise.all(
    Array.from({ length: 6 }).map(async (_, i) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 0, 23, 59, 59);
      const agg = await prisma.feePayment.aggregate({
        _sum: { amountPaid: true },
        where: { paymentDate: { gte: monthDate, lte: monthEnd } },
      });
      return {
        month: monthDate.toLocaleString("default", { month: "short", year: "2-digit" }),
        collected: Number(agg._sum.amountPaid ?? 0),
      };
    })
  );

  return success({
    ...summary,
    monthlyTrend,
    recentPayments: recentPayments.map((p) => ({
      id: p.id,
      receiptNumber: p.receiptNumber,
      studentName: `${p.studentFee.student.firstName} ${p.studentFee.student.lastName}`,
      registrationNumber: p.studentFee.student.registrationNumber,
      feeCategoryName: p.studentFee.feeStructure.feeCategory.name,
      amountPaid: Number(p.amountPaid),
      paymentDate: p.paymentDate,
      paymentMethod: p.paymentMethod,
    })),
    statusBreakdown: statusBreakdown.map((s) => ({
      status: s.status,
      count: s._count,
      totalAmount: Number(s._sum.finalAmount ?? 0),
    })),
  });
}
