import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { upsertSalaryStructureSchema } from "@/lib/validators/salary-structure.validator";
import { success, created, failure } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const guard = await requirePermission("payroll.view");
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");

  const structures = await prisma.salaryStructure.findMany({
    where: { ...(employeeId && { employeeId }) },
    include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
    orderBy: { createdAt: "desc" },
  });

  return success(
    structures.map((s) => ({
      id: s.id,
      employeeId: s.employeeId,
      employeeName: `${s.employee.firstName} ${s.employee.lastName}`,
      employeeCode: s.employee.employeeCode,
      basicSalary: Number(s.basicSalary),
      allowances: Number(s.allowances),
      deductions: Number(s.deductions),
    }))
  );
}

/** Creates or replaces the salary structure for an employee (one structure per employee). */
export async function POST(req: NextRequest) {
  const guard = await requirePermission("payroll.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = upsertSalaryStructureSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const { employeeId, ...rest } = parsed.data;

  const employee = await prisma.employee.findFirst({ where: { id: employeeId, deletedAt: null } });
  if (!employee) return failure("Employee not found", 404);

  const structure = await prisma.salaryStructure.upsert({
    where: { employeeId },
    update: rest,
    create: { employeeId, ...rest },
  });

  await logAudit({
    userId: guard.payload!.sub,
    action: "UPDATE",
    entityType: "SalaryStructure",
    entityId: structure.id,
    newValues: parsed.data,
    ipAddress,
    userAgent,
  });

  return created(structure);
}
