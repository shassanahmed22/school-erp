import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { updateVehicleSchema } from "@/lib/validators/vehicle.validator";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("transport.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateVehicleSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.vehicle.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Vehicle not found");

  const vehicle = await prisma.vehicle.update({ where: { id: params.id }, data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "Vehicle", entityId: vehicle.id, newValues: parsed.data, ipAddress, userAgent });

  return success(vehicle);
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("transport.delete");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.vehicle.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Vehicle not found");

  const inUse = await prisma.route.count({ where: { vehicleId: params.id, deletedAt: null } });
  if (inUse > 0) return failure("Cannot delete a vehicle that is assigned to a route", 409);

  await prisma.vehicle.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  await logAudit({ userId: guard.payload!.sub, action: "DELETE", entityType: "Vehicle", entityId: params.id, ipAddress, userAgent });

  return success(null, "Vehicle deleted successfully");
}
