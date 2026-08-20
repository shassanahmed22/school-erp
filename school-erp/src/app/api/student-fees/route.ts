import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { resolveStudentScope, applyStudentScope } from "@/lib/student-scope";
import { assignStudentFeeSchema, studentFeeQuerySchema } from "@/lib/validators/student-fee.validator";
import { computeScholarshipDiscount, recomputeStudentFeeStatus } from "@/lib/fee-service";
import { paginated, created, unauthorized, failure } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const payload = await getCurrentUserFromCookies();
  if (!payload) return unauthorized();

  const { searchParams } = new URL(req.url);
  const parsed = studentFeeQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return failure("Invalid query parameters", 422, parsed.error.flatten());

  const { classId, sectionId, feeStructureId, status, search, page, limit } = parsed.data;
  const requestedStudentId = parsed.data.studentId;

  // Students see only their own fees; parents only their linked children's.
  const scope = await resolveStudentScope(payload);
  if (scope.type === "unrestricted") {
    const guard = await requirePermission("student-fees.view");
    if (guard.error) return guard.error;
  }
  const { studentIdFilter, forbidden } = applyStudentScope(scope, requestedStudentId);
  if (forbidden) return paginated([], { page, limit, total: 0 });

  const where = {
    ...(studentIdFilter && { studentId: studentIdFilter }),
    ...(feeStructureId && { feeStructureId }),
    ...(status && { status }),
    ...((classId || sectionId) && {
      feeStructure: { ...(classId && { classId }) },
      ...(sectionId && { student: { enrollments: { some: { sectionId, status: "ACTIVE" as const } } } }),
    }),
    ...(search && {
      student: {
        OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          { registrationNumber: { contains: search, mode: "insensitive" as const } },
        ],
      },
    }),
  };

  const [items, total] = await Promise.all([
    prisma.studentFee.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { dueDate: "asc" },
      include: {
        student: { select: { firstName: true, lastName: true, registrationNumber: true } },
        feeStructure: { include: { feeCategory: { select: { name: true } }, class: { select: { name: true } } } },
        payments: { select: { amountPaid: true } },
      },
    }),
    prisma.studentFee.count({ where }),
  ]);

  const data = items.map((sf) => ({
    id: sf.id,
    studentId: sf.studentId,
    studentName: `${sf.student.firstName} ${sf.student.lastName}`,
    registrationNumber: sf.student.registrationNumber,
    feeCategoryName: sf.feeStructure.feeCategory.name,
    className: sf.feeStructure.class.name,
    amount: Number(sf.amount),
    discount: Number(sf.discount),
    finalAmount: Number(sf.finalAmount),
    paidAmount: sf.payments.reduce((sum, p) => sum + Number(p.amountPaid), 0),
    dueDate: sf.dueDate,
    status: sf.status,
  }));

  return paginated(data, { page, limit, total });
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("student-fees.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = assignStudentFeeSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const { studentId, feeStructureId, discount } = parsed.data;

  const [student, feeStructure] = await Promise.all([
    prisma.student.findFirst({ where: { id: studentId, deletedAt: null } }),
    prisma.feeStructure.findFirst({ where: { id: feeStructureId, deletedAt: null } }),
  ]);
  if (!student) return failure("Student not found", 404);
  if (!feeStructure) return failure("Fee structure not found", 404);

  const existing = await prisma.studentFee.findUnique({
    where: { studentId_feeStructureId: { studentId, feeStructureId } },
  });
  if (existing) return failure("This fee has already been assigned to the student", 409);

  const amount = Number(feeStructure.amount);
  const scholarshipDiscount = await computeScholarshipDiscount(studentId, amount);
  const totalDiscount = Math.min(discount + scholarshipDiscount, amount);
  const finalAmount = amount - totalDiscount;

  const studentFee = await prisma.studentFee.create({
    data: {
      studentId,
      feeStructureId,
      amount,
      discount: totalDiscount,
      finalAmount,
      dueDate: feeStructure.dueDate,
      assignedById: guard.payload!.sub,
    },
  });

  await recomputeStudentFeeStatus(studentFee.id);

  await logAudit({
    userId: guard.payload!.sub,
    action: "CREATE",
    entityType: "StudentFee",
    entityId: studentFee.id,
    newValues: { studentId, feeStructureId, finalAmount },
    ipAddress,
    userAgent,
  });
  await logActivity({ userId: guard.payload!.sub, type: "FEE", description: `Assigned fee to ${student.firstName} ${student.lastName}` });

  return created(studentFee);
}
