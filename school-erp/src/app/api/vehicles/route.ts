import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { createVehicleSchema } from "@/lib/validators/vehicle.validator";
import { success, created, failure } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function GET() {
  const guard = await requirePermission("transport.view");
  if (guard.error) return guard.error;

  const vehicles = await prisma.vehicle.findMany({
    where: { deletedAt: null },
    orderBy: { vehicleNumber: "asc" },
    include: { _count: { select: { routes: true } } },
  });

  return success(
    vehicles.map((v) => ({
      id: v.id,
      vehicleNumber: v.vehicleNumber,
      model: v.model,
      capacity: v.capacity,
      status: v.status,
      routeCount: v._count.routes,
    }))
  );
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("transport.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = createVehicleSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.vehicle.findUnique({ where: { vehicleNumber: parsed.data.vehicleNumber } });
  if (existing) return failure("A vehicle with this number already exists", 409);

  const vehicle = await prisma.vehicle.create({ data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "CREATE", entityType: "Vehicle", entityId: vehicle.id, newValues: parsed.data, ipAddress, userAgent });

  return created(vehicle);
}
