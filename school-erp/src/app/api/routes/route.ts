import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { createRouteSchema } from "@/lib/validators/route.validator";
import { success, created, failure } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function GET() {
  const guard = await requirePermission("transport.view");
  if (guard.error) return guard.error;

  const routes = await prisma.route.findMany({
    where: { deletedAt: null },
    orderBy: { routeName: "asc" },
    include: {
      vehicle: { select: { vehicleNumber: true } },
      driver: { select: { name: true } },
      _count: { select: { studentTransports: { where: { status: "ACTIVE" } } } },
    },
  });

  return success(
    routes.map((r) => ({
      id: r.id,
      routeName: r.routeName,
      startPoint: r.startPoint,
      endPoint: r.endPoint,
      monthlyFee: Number(r.monthlyFee),
      vehicleId: r.vehicleId,
      vehicleNumber: r.vehicle?.vehicleNumber ?? null,
      driverId: r.driverId,
      driverName: r.driver?.name ?? null,
      assignedStudentCount: r._count.studentTransports,
    }))
  );
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("transport.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = createRouteSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const route = await prisma.route.create({ data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "CREATE", entityType: "Route", entityId: route.id, newValues: parsed.data, ipAddress, userAgent });

  return created(route);
}
