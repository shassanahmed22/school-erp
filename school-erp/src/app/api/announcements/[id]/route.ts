import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { updateAnnouncementSchema } from "@/lib/validators/announcement.validator";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const guard = await requirePermission("announcements.edit");

  if (guard.error) return guard.error;

  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();

  const parsed = updateAnnouncementSchema.safeParse(body);

  if (!parsed.success) {
    return failure("Validation failed", 422, parsed.error.flatten());
  }

  const existing = await prisma.announcement.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) return notFound("Announcement not found");

  const announcement = await prisma.announcement.update({
    where: { id },
    data: parsed.data,
  });

  await logAudit({
    userId: guard.payload!.sub,
    action: "UPDATE",
    entityType: "Announcement",
    entityId: announcement.id,
    newValues: parsed.data,
    ipAddress,
    userAgent,
  });

  return success(announcement);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const guard = await requirePermission("announcements.delete");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.announcement.findFirst({ where: { id: id, deletedAt: null } });
  if (!existing) return notFound("Announcement not found");

  await prisma.announcement.update({ where: { id: id }, data: { deletedAt: new Date() } });
  await logAudit({ userId: guard.payload!.sub, action: "DELETE", entityType: "Announcement", entityId: id, ipAddress, userAgent });

  return success(null, "Announcement deleted successfully");
}
