import { prisma } from "./prisma";

export interface PayrollCalculation {
  basicSalary: number;
  allowances: number;
  bonus: number;
  deductions: number;
  grossSalary: number;
  netSalary: number;
}

/** Computes gross/net salary from a base structure plus any one-off bonus for the month. */
export function calculatePayroll(params: {
  basicSalary: number;
  allowances: number;
  deductions: number;
  bonus?: number;
}): PayrollCalculation {
  const bonus = params.bonus ?? 0;
  const grossSalary = params.basicSalary + params.allowances + bonus;
  const netSalary = grossSalary - params.deductions;

  return {
    basicSalary: params.basicSalary,
    allowances: params.allowances,
    bonus,
    deductions: params.deductions,
    grossSalary,
    netSalary,
  };
}

/**
 * Generates (or refreshes, if still PENDING) payroll for every active employee who has a
 * salary structure, for the given month/year. Employees already PAID for the period are
 * left untouched. Returns counts for the UI to report back.
 */
export async function generateMonthlyPayroll(month: number, year: number, generatedById: string) {
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
    include: { salaryStructure: true },
  });

  // One query for every employee's existing payroll row this month instead
  // of a findUnique per employee inside the loop below.
  const existingPayrolls = await prisma.payroll.findMany({
    where: { employeeId: { in: employees.map((e) => e.id) }, month, year },
    select: { employeeId: true, paymentStatus: true },
  });
  const existingByEmployee = new Map(existingPayrolls.map((p) => [p.employeeId, p.paymentStatus]));

  let generated = 0;
  let skipped = 0;

  for (const employee of employees) {
    const structure = employee.salaryStructure;
    if (!structure) { skipped++; continue; }

    if (existingByEmployee.get(employee.id) === "PAID") { skipped++; continue; }

    const calc = calculatePayroll({
      basicSalary: Number(structure.basicSalary),
      allowances: Number(structure.allowances),
      deductions: Number(structure.deductions),
    });

    await prisma.payroll.upsert({
      where: { employeeId_month_year: { employeeId: employee.id, month, year } },
      update: { ...calc, generatedById },
      create: { employeeId: employee.id, month, year, ...calc, generatedById },
    });
    generated++;
  }

  return { generated, skipped, totalEmployees: employees.length };
}

export interface PayrollSummary {
  monthlyPayrollCost: number;
  pendingCount: number;
  pendingAmount: number;
  paidCount: number;
}

export async function computePayrollSummary(month: number, year: number): Promise<PayrollSummary> {
  const [pendingAgg, paidAgg] = await Promise.all([
    prisma.payroll.aggregate({
      _sum: { netSalary: true },
      _count: true,
      where: { month, year, paymentStatus: "PENDING" },
    }),
    prisma.payroll.aggregate({
      _sum: { netSalary: true },
      _count: true,
      where: { month, year, paymentStatus: "PAID" },
    }),
  ]);

  return {
    monthlyPayrollCost: Number(pendingAgg._sum.netSalary ?? 0) + Number(paidAgg._sum.netSalary ?? 0),
    pendingCount: pendingAgg._count,
    pendingAmount: Number(pendingAgg._sum.netSalary ?? 0),
    paidCount: paidAgg._count,
  };
}
