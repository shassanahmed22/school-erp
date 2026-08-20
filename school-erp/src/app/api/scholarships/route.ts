import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { createScholarshipSchema } from "@/lib/validators/scholarship.validator";
import { success, created, failure } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function GET() {
  const guard = await requirePermission("scholarships.view");
  if (guard.error) return guard.error;

  const scholarships = await prisma.scholarship.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    include: { _count: { select: { studentScholarships: true } } },
  });

  return success(
    scholarships.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      value: Number(s.value),
      description: s.description,
      status: s.status,
      studentCount: s._count.studentScholarships,
    }))
  );
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("scholarships.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = createScholarshipSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const scholarship = await prisma.scholarship.create({ data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "CREATE", entityType: "Scholarship", entityId: scholarship.id, newValues: parsed.data, ipAddress, userAgent });
  await logActivity({ userId: guard.payload!.sub, type: "SCHOLARSHIP", description: `Created scholarship: ${scholarship.name}` });

  return created(scholarship);
}
