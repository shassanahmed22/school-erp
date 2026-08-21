import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { createFeeStructureSchema, feeStructureQuerySchema } from "@/lib/validators/fee-structure.validator";
import { success, created, failure } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const guard = await requirePermission("fee-structures.view");
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const parsed = feeStructureQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return failure("Invalid query parameters", 422, parsed.error.flatten());

  const { classId, academicYearId, feeCategoryId, status } = parsed.data;

  const structures = await prisma.feeStructure.findMany({
    where: {
      deletedAt: null,
      ...(classId && { classId }),
      ...(academicYearId && { academicYearId }),
      ...(feeCategoryId && { feeCategoryId }),
      ...(status && { status }),
    },
    orderBy: { dueDate: "asc" },
    include: {
      class: { select: { name: true } },
      academicYear: { select: { name: true } },
      feeCategory: { select: { name: true } },
      _count: { select: { studentFees: true } },
    },
  });

  return success(
    structures.map((s) => ({
      id: s.id,
      classId: s.classId,
      className: s.class.name,
      academicYearId: s.academicYearId,
      academicYearName: s.academicYear.name,
      feeCategoryId: s.feeCategoryId,
      feeCategoryName: s.feeCategory.name,
      amount: Number(s.amount),
      dueDate: s.dueDate,
      status: s.status,
      assignedCount: s._count.studentFees,
    }))
  );
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("fee-structures.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = createFeeStructureSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.feeStructure.findFirst({
    where: {
      classId: parsed.data.classId,
      academicYearId: parsed.data.academicYearId,
      feeCategoryId: parsed.data.feeCategoryId,
      deletedAt: null,
    },
  });
  if (existing) return failure("A fee structure for this class, year, and category already exists", 409);

  const structure = await prisma.feeStructure.create({
    data: { ...parsed.data, createdById: guard.payload!.sub },
  });

  await logAudit({ userId: guard.payload!.sub, action: "CREATE", entityType: "FeeStructure", entityId: structure.id, newValues: parsed.data, ipAddress, userAgent });
  await logActivity({ userId: guard.payload!.sub, type: "FEE", description: "Created a new fee structure" });

  return created(structure);
}
