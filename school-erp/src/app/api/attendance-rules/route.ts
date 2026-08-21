import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { updateAttendanceRuleSchema } from "@/lib/validators/attendance.validator";
import { success, failure } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function GET() {
  const guard = await requirePermission("attendance.view");
  if (guard.error) return guard.error;

  const rule = await prisma.attendanceRule.findFirst({ where: { isActive: true }, orderBy: { createdAt: "desc" } });
  return success(rule ?? { minimumAttendancePercentage: 75, isActive: true, name: "Default Attendance Rule" });
}

export async function PATCH(req: NextRequest) {
  const guard = await requirePermission("settings.manage");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateAttendanceRuleSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.attendanceRule.findFirst({ where: { isActive: true } });

  const rule = existing
    ? await prisma.attendanceRule.update({ where: { id: existing.id }, data: parsed.data })
    : await prisma.attendanceRule.create({ data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "SETTINGS_CHANGE", entityType: "AttendanceRule", entityId: rule.id, newValues: parsed.data, ipAddress, userAgent });

  return success(rule, "Attendance rule updated");
}
