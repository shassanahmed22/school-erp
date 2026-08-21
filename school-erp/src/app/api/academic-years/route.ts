import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { createAcademicYearSchema } from "@/lib/validators/academic.validator";
import { success, created, failure } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function GET() {
  const guard = await requirePermission("academic-years.view");
  if (guard.error) return guard.error;

  const years = await prisma.academicYear.findMany({
    where: { deletedAt: null },
    orderBy: { startDate: "desc" },
  });

  return success(years);
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("academic-years.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = createAcademicYearSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.academicYear.findUnique({ where: { name: parsed.data.name } });
  if (existing) return failure("An academic year with this name already exists", 409);

  // Only one academic year may be "current" at a time
  const year = await prisma.$transaction(async (tx) => {
    if (parsed.data.isCurrent) {
      await tx.academicYear.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } });
    }
    return tx.academicYear.create({ data: parsed.data });
  });

  await logAudit({ userId: guard.payload!.sub, action: "CREATE", entityType: "AcademicYear", entityId: year.id, newValues: parsed.data, ipAddress, userAgent });
  await logActivity({ userId: guard.payload!.sub, type: "CLASS", description: `Created academic year: ${year.name}` });

  return created(year);
}
