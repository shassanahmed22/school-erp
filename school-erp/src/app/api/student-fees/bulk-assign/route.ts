import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { bulkAssignFeeSchema } from "@/lib/validators/student-fee.validator";
import { success, failure } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const guard = await requirePermission("student-fees.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = bulkAssignFeeSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const { feeStructureId, sectionId, classId, applyScholarships } = parsed.data;

  const feeStructure = await prisma.feeStructure.findFirst({ where: { id: feeStructureId, deletedAt: null } });
  if (!feeStructure) return failure("Fee structure not found", 404);

  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      status: "ACTIVE",
      section: { classId, ...(sectionId && { id: sectionId }) },
    },
    select: { studentId: true },
  });

  if (enrollments.length === 0) return failure("No active students found for the selected class/section", 404);

  const studentIds = enrollments.map((e) => e.studentId);
  const amount = Number(feeStructure.amount);
  const now = new Date();

  // Batch-fetch everything needed up front instead of one round-trip per
  // student — this is what turned a class of 40 students into 40+ sequential
  // queries before. Two queries total now, regardless of class size.
  const [existingFees, activeScholarships] = await Promise.all([
    prisma.studentFee.findMany({
      where: { studentId: { in: studentIds }, feeStructureId },
      select: { studentId: true },
    }),
    applyScholarships
      ? prisma.studentScholarship.findMany({
          where: { studentId: { in: studentIds }, scholarship: { status: "ACTIVE", deletedAt: null } },
          include: { scholarship: { select: { type: true, value: true } } },
        })
      : Promise.resolve([]),
  ]);

  const alreadyAssigned = new Set(existingFees.map((f) => f.studentId));

  const scholarshipsByStudent = new Map<string, typeof activeScholarships>();
  for (const s of activeScholarships) {
    const list = scholarshipsByStudent.get(s.studentId) ?? [];
    list.push(s);
    scholarshipsByStudent.set(s.studentId, list);
  }

  const rowsToCreate: {
    studentId: string;
    feeStructureId: string;
    amount: number;
    discount: number;
    finalAmount: number;
    dueDate: Date;
    assignedById: string;
    status: "PENDING" | "OVERDUE";
  }[] = [];
  let skipped = 0;

  for (const studentId of studentIds) {
    if (alreadyAssigned.has(studentId)) {
      skipped++;
      continue;
    }

    let discount = 0;
    const scholarships = scholarshipsByStudent.get(studentId) ?? [];
    for (const s of scholarships) {
      discount += s.scholarship.type === "PERCENTAGE" ? (amount * Number(s.scholarship.value)) / 100 : Number(s.scholarship.value);
    }
    discount = Math.min(discount, amount);
    const finalAmount = amount - discount;

    rowsToCreate.push({
      studentId,
      feeStructureId,
      amount,
      discount,
      finalAmount,
      dueDate: feeStructure.dueDate,
      assignedById: guard.payload!.sub,
      // A freshly assigned fee has zero payments yet, so status is
      // deterministic from dueDate alone — no need to re-query per row.
      status: feeStructure.dueDate < now ? "OVERDUE" : "PENDING",
    });
  }

  if (rowsToCreate.length > 0) {
    await prisma.studentFee.createMany({ data: rowsToCreate, skipDuplicates: true });
  }
  const assigned = rowsToCreate.length;

  await logAudit({
    userId: guard.payload!.sub,
    action: "CREATE",
    entityType: "StudentFee",
    newValues: { feeStructureId, classId, sectionId, assigned, skipped },
    ipAddress,
    userAgent,
  });
  await logActivity({
    userId: guard.payload!.sub,
    type: "FEE",
    description: `Bulk-assigned fee to ${assigned} student(s)${skipped > 0 ? ` (${skipped} already had it)` : ""}`,
  });

  return success({ assigned, skipped }, `Fee assigned to ${assigned} student(s)`);
}
