import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { payrollQuerySchema } from "@/lib/validators/payroll.validator";
import { paginated, unauthorized, failure } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const payload = await getCurrentUserFromCookies();
  if (!payload) return unauthorized();

  const { searchParams } = new URL(req.url);
  const parsed = payrollQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return failure("Invalid query parameters", 422, parsed.error.flatten());

  const { departmentId, month, year, paymentStatus, page, limit } = parsed.data;
  let { employeeId } = parsed.data;

  // Employees with a portal login may only ever see their own payslips.
  const ownEmployee = await prisma.employee.findUnique({ where: { userId: payload.sub } });
  if (ownEmployee) {
    employeeId = ownEmployee.id;
  } else {
    const guard = await requirePermission("payroll.view");
    if (guard.error) return guard.error;
  }

  const where = {
    ...(employeeId && { employeeId }),
    ...(month && { month }),
    ...(year && { year }),
    ...(paymentStatus && { paymentStatus }),
    ...(departmentId && { employee: { departmentId } }),
  };

  const [items, total] = await Promise.all([
    prisma.payroll.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: { employee: { include: { department: { select: { name: true } } } } },
    }),
    prisma.payroll.count({ where }),
  ]);

  const data = items.map((p) => ({
    id: p.id,
    employeeId: p.employeeId,
    employeeName: `${p.employee.firstName} ${p.employee.lastName}`,
    employeeCode: p.employee.employeeCode,
    departmentName: p.employee.department.name,
    month: p.month,
    year: p.year,
    basicSalary: Number(p.basicSalary),
    allowances: Number(p.allowances),
    bonus: Number(p.bonus),
    deductions: Number(p.deductions),
    grossSalary: Number(p.grossSalary),
    netSalary: Number(p.netSalary),
    paymentStatus: p.paymentStatus,
    paymentDate: p.paymentDate,
  }));

  return paginated(data, { page, limit, total });
}
