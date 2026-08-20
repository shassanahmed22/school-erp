import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { resolveStudentScope, applyStudentScope } from "@/lib/student-scope";
import { recordPaymentSchema, paymentQuerySchema } from "@/lib/validators/payment.validator";
import { generateReceiptNumber, recomputeStudentFeeStatus } from "@/lib/fee-service";
import { paginated, created, unauthorized, failure } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const payload = await getCurrentUserFromCookies();
  if (!payload) return unauthorized();

  const { searchParams } = new URL(req.url);
  const parsed = paymentQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return failure("Invalid query parameters", 422, parsed.error.flatten());

  const { studentFeeId, paymentMethod, startDate, endDate, page, limit } = parsed.data;
  const requestedStudentId = parsed.data.studentId;

  const scope = await resolveStudentScope(payload);
  if (scope.type === "unrestricted") {
    const guard = await requirePermission("fee-payments.view");
    if (guard.error) return guard.error;
  }
  const { studentIdFilter, forbidden } = applyStudentScope(scope, requestedStudentId);
  if (forbidden) return paginated([], { page, limit, total: 0 });

  const where = {
    ...(studentFeeId && { studentFeeId }),
    ...(paymentMethod && { paymentMethod }),
    ...(studentIdFilter && { studentFee: { studentId: studentIdFilter } }),
    ...((startDate || endDate) && {
      paymentDate: { ...(startDate && { gte: startDate }), ...(endDate && { lte: endDate }) },
    }),
  };

  const [items, total] = await Promise.all([
    prisma.feePayment.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { paymentDate: "desc" },
      include: {
        studentFee: {
          include: {
            student: { select: { firstName: true, lastName: true, registrationNumber: true } },
            feeStructure: { include: { feeCategory: { select: { name: true } } } },
          },
        },
        collectedBy: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.feePayment.count({ where }),
  ]);

  const data = items.map((p) => ({
    id: p.id,
    receiptNumber: p.receiptNumber,
    studentFeeId: p.studentFeeId,
    studentName: `${p.studentFee.student.firstName} ${p.studentFee.student.lastName}`,
    registrationNumber: p.studentFee.student.registrationNumber,
    feeCategoryName: p.studentFee.feeStructure.feeCategory.name,
    amountPaid: Number(p.amountPaid),
    paymentDate: p.paymentDate,
    paymentMethod: p.paymentMethod,
    referenceNumber: p.referenceNumber,
    collectedByName: p.collectedBy ? `${p.collectedBy.firstName} ${p.collectedBy.lastName}` : null,
  }));

  return paginated(data, { page, limit, total });
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("fee-payments.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = recordPaymentSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const studentFee = await prisma.studentFee.findUnique({
    where: { id: parsed.data.studentFeeId },
    include: { payments: true },
  });
  if (!studentFee) return failure("Student fee record not found", 404);
  if (studentFee.status === "WAIVED") return failure("This fee has been waived and cannot accept payments", 409);

  const alreadyPaid = studentFee.payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
  const remaining = Number(studentFee.finalAmount) - alreadyPaid;
  if (parsed.data.amountPaid > remaining + 0.01) {
    return failure(`Payment exceeds the remaining balance of ${remaining.toFixed(2)}`, 422);
  }

  const receiptNumber = await generateReceiptNumber();

  const payment = await prisma.feePayment.create({
    data: {
      ...parsed.data,
      receiptNumber,
      collectedById: guard.payload!.sub,
    },
  });

  await recomputeStudentFeeStatus(studentFee.id);

  await logAudit({
    userId: guard.payload!.sub,
    action: "CREATE",
    entityType: "FeePayment",
    entityId: payment.id,
    newValues: { studentFeeId: studentFee.id, amountPaid: parsed.data.amountPaid, receiptNumber },
    ipAddress,
    userAgent,
  });
  await logActivity({
    userId: guard.payload!.sub,
    type: "PAYMENT",
    description: `Recorded payment of ${parsed.data.amountPaid} (Receipt ${receiptNumber})`,
  });

  return created({ id: payment.id, receiptNumber: payment.receiptNumber });
}
