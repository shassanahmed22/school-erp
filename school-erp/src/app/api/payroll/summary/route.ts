import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/api-guard";
import { computePayrollSummary } from "@/lib/payroll-service";
import { success, failure } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const guard = await requirePermission("payroll.view");
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const month = Number(searchParams.get("month") ?? now.getMonth() + 1);
  const year = Number(searchParams.get("year") ?? now.getFullYear());

  if (Number.isNaN(month) || Number.isNaN(year)) return failure("Invalid month/year", 422);

  const summary = await computePayrollSummary(month, year);
  return success({ month, year, ...summary });
}
