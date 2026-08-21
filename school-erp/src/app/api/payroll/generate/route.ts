import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/api-guard";
import { generatePayrollSchema } from "@/lib/validators/payroll.validator";
import { generateMonthlyPayroll } from "@/lib/payroll-service";
import { success, failure } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const guard = await requirePermission("payroll.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = generatePayrollSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const { month, year } = parsed.data;
  const result = await generateMonthlyPayroll(month, year, guard.payload!.sub);

  await logAudit({
    userId: guard.payload!.sub,
    action: "CREATE",
    entityType: "Payroll",
    newValues: { month, year, ...result },
    ipAddress,
    userAgent,
  });
  await logActivity({
    userId: guard.payload!.sub,
    type: "PAYROLL",
    description: `Generated payroll for ${month}/${year}: ${result.generated} employee(s)`,
  });

  return success(result, `Payroll generated for ${result.generated} employee(s)`);
}
