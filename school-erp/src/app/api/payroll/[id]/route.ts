import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { updatePayrollSchema } from "@/lib/validators/payroll.validator";
import { calculatePayroll } from "@/lib/payroll-service";
import { success, failure, notFound, unauthorized, forbidden } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const payload = await getCurrentUserFromCookies();
  if (!payload) return unauthorized();

  const payroll = await prisma.payroll.findUnique({
    where: { id: params.id },
    include: { employee: { include: { department: true, designation: true } } },
  });
  if (!payroll) return notFound("Payroll record not found");

  const isOwner = payroll.employee.userId === payload.sub;
  if (!isOwner) {
    const guard = await requirePermission("payroll.view");
    if (guard.error) return guard.error;
  }

  return success({
    id: payroll.id,
    employee: {
      firstName: payroll.employee.firstName,
      lastName: payroll.employee.lastName,
      employeeCode: payroll.employee.employeeCode,
      departmentName: payroll.employee.department.name,
      designationTitle: payroll.employee.designation.title,
    },
    month: payroll.month,
    year: payroll.year,
    basicSalary: Number(payroll.basicSalary),
    allowances: Number(payroll.allowances),
    bonus: Number(payroll.bonus),
    deductions: Number(payroll.deductions),
    grossSalary: Number(payroll.grossSalary),
    netSalary: Number(payroll.netSalary),
    paymentStatus: payroll.paymentStatus,
    paymentDate: payroll.paymentDate,
    remarks: payroll.remarks,
  });
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("payroll.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updatePayrollSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.payroll.findUnique({ where: { id: params.id } });
  if (!existing) return notFound("Payroll record not found");
  if (existing.paymentStatus === "PAID") return forbidden("Cannot modify a payroll record that has already been paid");

  const bonus = parsed.data.bonus ?? Number(existing.bonus);
  const deductions = parsed.data.deductions ?? Number(existing.deductions);
  const calc = calculatePayroll({
    basicSalary: Number(existing.basicSalary),
    allowances: Number(existing.allowances),
    deductions,
    bonus,
  });

  const payroll = await prisma.payroll.update({
    where: { id: params.id },
    data: { ...calc, remarks: parsed.data.remarks },
  });

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "Payroll", entityId: payroll.id, newValues: parsed.data, ipAddress, userAgent });

  return success(payroll);
}
