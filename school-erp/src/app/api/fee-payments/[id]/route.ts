import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { success, unauthorized, notFound } from "@/lib/api-response";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const payload = await getCurrentUserFromCookies();
  if (!payload) return unauthorized();

  const payment = await prisma.feePayment.findUnique({
    where: { id: params.id },
    include: {
      studentFee: {
        include: {
          student: { select: { firstName: true, lastName: true, registrationNumber: true, userId: true } },
          feeStructure: { include: { feeCategory: true, class: true, academicYear: true } },
        },
      },
      collectedBy: { select: { firstName: true, lastName: true } },
    },
  });
  if (!payment) return notFound("Payment not found");

  const isOwner = hasRole(payload, "student") && payment.studentFee.student.userId === payload.sub;
  if (!isOwner) {
    const guard = await requirePermission("fee-payments.view");
    if (guard.error) return guard.error;
  }

  return success({
    id: payment.id,
    receiptNumber: payment.receiptNumber,
    amountPaid: Number(payment.amountPaid),
    paymentDate: payment.paymentDate,
    paymentMethod: payment.paymentMethod,
    referenceNumber: payment.referenceNumber,
    remarks: payment.remarks,
    collectedByName: payment.collectedBy ? `${payment.collectedBy.firstName} ${payment.collectedBy.lastName}` : null,
    student: payment.studentFee.student,
    feeCategoryName: payment.studentFee.feeStructure.feeCategory.name,
    className: payment.studentFee.feeStructure.class.name,
    academicYearName: payment.studentFee.feeStructure.academicYear.name,
    finalAmount: Number(payment.studentFee.finalAmount),
  });
}
