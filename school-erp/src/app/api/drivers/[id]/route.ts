import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { updateDriverSchema } from "@/lib/validators/driver.validator";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("transport.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateDriverSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.driver.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Driver not found");

  const driver = await prisma.driver.update({ where: { id: params.id }, data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "Driver", entityId: driver.id, newValues: parsed.data, ipAddress, userAgent });

  return success(driver);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("transport.delete");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.driver.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Driver not found");

  const inUse = await prisma.route.count({ where: { driverId: params.id, deletedAt: null } });
  if (inUse > 0) return failure("Cannot delete a driver that is assigned to a route", 409);

  await prisma.driver.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  await logAudit({ userId: guard.payload!.sub, action: "DELETE", entityType: "Driver", entityId: params.id, ipAddress, userAgent });

  return success(null, "Driver deleted successfully");
}
