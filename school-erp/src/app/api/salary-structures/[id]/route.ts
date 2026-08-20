import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  basicSalary: z.coerce.number().min(0).optional(),
  allowances: z.coerce.number().min(0).optional(),
  deductions: z.coerce.number().min(0).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("payroll.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.salaryStructure.findUnique({ where: { id: params.id } });
  if (!existing) return notFound("Salary structure not found");

  const structure = await prisma.salaryStructure.update({ where: { id: params.id }, data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "SalaryStructure", entityId: structure.id, newValues: parsed.data, ipAddress, userAgent });

  return success(structure);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("payroll.delete");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.salaryStructure.findUnique({ where: { id: params.id } });
  if (!existing) return notFound("Salary structure not found");

  await prisma.salaryStructure.delete({ where: { id: params.id } });
  await logAudit({ userId: guard.payload!.sub, action: "DELETE", entityType: "SalaryStructure", entityId: params.id, ipAddress, userAgent });

  return success(null, "Salary structure removed");
}
