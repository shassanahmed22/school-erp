import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { createDesignationSchema } from "@/lib/validators/designation.validator";
import { success, created, failure } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const guard = await requirePermission("departments.view");
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get("departmentId") ?? undefined;

  const designations = await prisma.designation.findMany({
    where: { deletedAt: null, ...(departmentId && { departmentId }) },
    orderBy: { title: "asc" },
    include: { department: { select: { name: true } }, _count: { select: { employees: { where: { deletedAt: null } } } } },
  });

  return success(
    designations.map((d) => ({
      id: d.id,
      departmentId: d.departmentId,
      departmentName: d.department.name,
      title: d.title,
      description: d.description,
      employeeCount: d._count.employees,
    }))
  );
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("departments.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = createDesignationSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.designation.findFirst({
    where: { departmentId: parsed.data.departmentId, title: parsed.data.title, deletedAt: null },
  });
  if (existing) return failure("This designation already exists in the selected department", 409);

  const designation = await prisma.designation.create({ data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "CREATE", entityType: "Designation", entityId: designation.id, newValues: parsed.data, ipAddress, userAgent });

  return created(designation);
}
