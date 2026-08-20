import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { updateRouteSchema } from "@/lib/validators/route.validator";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("transport.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateRouteSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.route.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Route not found");

  const route = await prisma.route.update({ where: { id: params.id }, data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "Route", entityId: route.id, newValues: parsed.data, ipAddress, userAgent });

  return success(route);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("transport.delete");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.route.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return notFound("Route not found");

  const activeAssignments = await prisma.studentTransport.count({ where: { routeId: params.id, status: "ACTIVE" } });
  if (activeAssignments > 0) return failure("Cannot delete a route with actively assigned students", 409);

  await prisma.route.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  await logAudit({ userId: guard.payload!.sub, action: "DELETE", entityType: "Route", entityId: params.id, ipAddress, userAgent });

  return success(null, "Route deleted successfully");
}
