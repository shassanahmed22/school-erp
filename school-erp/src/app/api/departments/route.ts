import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { createDepartmentSchema } from "@/lib/validators/department.validator";
import { success, created, failure } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function GET() {
  const guard = await requirePermission("departments.view");
  if (guard.error) return guard.error;

  const departments = await prisma.department.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    include: { _count: { select: { employees: { where: { deletedAt: null } }, designations: true } } },
  });

  return success(
    departments.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      employeeCount: d._count.employees,
      designationCount: d._count.designations,
    }))
  );
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("departments.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = createDepartmentSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.department.findUnique({ where: { name: parsed.data.name } });
  if (existing) return failure("A department with this name already exists", 409);

  const department = await prisma.department.create({ data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "CREATE", entityType: "Department", entityId: department.id, newValues: parsed.data, ipAddress, userAgent });
  await logActivity({ userId: guard.payload!.sub, type: "SYSTEM", description: `Created department: ${department.name}` });

  return created(department);
}
