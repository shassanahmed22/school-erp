import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { updateEventSchema } from "@/lib/validators/event.validator";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("events.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateEventSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.event.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Event not found");

  const startDate = parsed.data.startDate ?? existing.startDate;
  const endDate = parsed.data.endDate ?? existing.endDate;
  if (endDate < startDate) return failure("End date cannot be before the start date", 422);

  const event = await prisma.event.update({ where: { id: params.id }, data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "Event", entityId: event.id, newValues: parsed.data, ipAddress, userAgent });

  return success(event);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("events.delete");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.event.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Event not found");

  await prisma.event.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  await logAudit({ userId: guard.payload!.sub, action: "DELETE", entityType: "Event", entityId: params.id, ipAddress, userAgent });

  return success(null, "Event deleted successfully");
}
