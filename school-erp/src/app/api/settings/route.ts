import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { updateSettingsSchema } from "@/lib/validators/settings.validator";
import { success, failure } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function GET() {
  const guard = await requirePermission("settings.view");
  if (guard.error) return guard.error;

  const settings = await prisma.setting.findMany({ orderBy: { key: "asc" } });

  const grouped = settings.reduce<Record<string, Record<string, string>>>((acc, s) => {
    const shortKey = s.key.split(".").slice(1).join(".");
    acc[s.group] = { ...(acc[s.group] ?? {}), [shortKey]: s.value };
    return acc;
  }, {});

  return success(grouped);
}

export async function PATCH(req: NextRequest) {
  const guard = await requirePermission("settings.manage");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  await prisma.$transaction(
    parsed.data.settings.map((s) =>
      prisma.setting.upsert({
        where: { key: s.key },
        update: { value: s.value },
        create: { key: s.key, value: s.value, group: s.key.split(".")[0] ?? "general" },
      })
    )
  );

  await logAudit({
    userId: guard.payload!.sub,
    action: "SETTINGS_CHANGE",
    entityType: "Setting",
    newValues: parsed.data,
    ipAddress,
    userAgent,
  });
  await logActivity({ userId: guard.payload!.sub, type: "SETTINGS", description: "Updated system settings" });

  return success(null, "Settings updated successfully");
}
