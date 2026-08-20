import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { updateStudentFeeSchema } from "@/lib/validators/student-fee.validator";
import { success, failure, notFound, unauthorized, forbidden } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const payload = await getCurrentUserFromCookies();
  if (!payload) return unauthorized();

  const studentFee = await prisma.studentFee.findUnique({
    where: { id: params.id },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, registrationNumber: true, userId: true } },
      feeStructure: { include: { feeCategory: true, class: true, academicYear: true } },
      payments: { orderBy: { paymentDate: "desc" } },
    },
  });
  if (!studentFee) return notFound("Student fee not found");

  const isOwner = hasRole(payload, "student") && studentFee.student.userId === payload.sub;
  if (!isOwner) {
    const guard = await requirePermission("student-fees.view");
    if (guard.error) return guard.error;
  }

  const paidAmount = studentFee.payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);

  return success({
    id: studentFee.id,
    student: studentFee.student,
    feeCategory: studentFee.feeStructure.feeCategory.name,
    className: studentFee.feeStructure.class.name,
    academicYearName: studentFee.feeStructure.academicYear.name,
    amount: Number(studentFee.amount),
    discount: Number(studentFee.discount),
    finalAmount: Number(studentFee.finalAmount),
    paidAmount,
    balanceAmount: Number(studentFee.finalAmount) - paidAmount,
    dueDate: studentFee.dueDate,
    status: studentFee.status,
    payments: studentFee.payments.map((p) => ({
      id: p.id,
      receiptNumber: p.receiptNumber,
      amountPaid: Number(p.amountPaid),
      paymentDate: p.paymentDate,
      paymentMethod: p.paymentMethod,
      referenceNumber: p.referenceNumber,
      remarks: p.remarks,
    })),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("student-fees.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateStudentFeeSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.studentFee.findUnique({ where: { id: params.id } });
  if (!existing) return notFound("Student fee not found");

  const { discount, ...rest } = parsed.data;
  const finalAmount = discount !== undefined ? Number(existing.amount) - discount : undefined;

  const studentFee = await prisma.studentFee.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(discount !== undefined && { discount, finalAmount }),
    },
  });

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "StudentFee", entityId: studentFee.id, oldValues: { discount: existing.discount, status: existing.status }, newValues: parsed.data, ipAddress, userAgent });

  return success(studentFee);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("student-fees.delete");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.studentFee.findUnique({ where: { id: params.id }, include: { payments: true } });
  if (!existing) return notFound("Student fee not found");
  if (existing.payments.length > 0) return forbidden("Cannot remove a fee that already has payments recorded");

  await prisma.studentFee.delete({ where: { id: params.id } });
  await logAudit({ userId: guard.payload!.sub, action: "DELETE", entityType: "StudentFee", entityId: params.id, ipAddress, userAgent });

  return success(null, "Fee assignment removed");
}
