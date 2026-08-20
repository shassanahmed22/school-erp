import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { markPayrollPaidSchema } from "@/lib/validators/payroll.validator";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("payroll.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json().catch(() => ({}));
  const parsed = markPayrollPaidSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.payroll.findUnique({ where: { id: params.id }, include: { employee: true } });
  if (!existing) return notFound("Payroll record not found");
  if (existing.paymentStatus === "PAID") return failure("This payroll has already been marked as paid", 409);

  const payroll = await prisma.payroll.update({
    where: { id: params.id },
    data: { paymentStatus: "PAID", paymentDate: parsed.data.paymentDate },
  });

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "Payroll", entityId: payroll.id, newValues: { paymentStatus: "PAID" }, ipAddress, userAgent });
  await logActivity({
    userId: guard.payload!.sub,
    type: "PAYROLL",
    description: `Marked salary paid for ${existing.employee.firstName} ${existing.employee.lastName} (${existing.month}/${existing.year})`,
  });

  return success(payroll, "Payroll marked as paid");
}
