import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { success } from "@/lib/api-response";

export async function GET() {
  const guard = await requirePermission("transport.view");
  if (guard.error) return guard.error;

  const [totalVehicles, activeVehicles, totalRoutes, totalDrivers, assignedStudents, routes] = await Promise.all([
    prisma.vehicle.count({ where: { deletedAt: null } }),
    prisma.vehicle.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    prisma.route.count({ where: { deletedAt: null } }),
    prisma.driver.count({ where: { deletedAt: null } }),
    prisma.studentTransport.count({ where: { status: "ACTIVE" } }),
    prisma.route.findMany({
      where: { deletedAt: null },
      include: {
        vehicle: { select: { vehicleNumber: true, capacity: true } },
        _count: { select: { studentTransports: { where: { status: "ACTIVE" } } } },
      },
      orderBy: { routeName: "asc" },
      take: 8,
    }),
  ]);

  return success({
    totalVehicles,
    activeVehicles,
    totalRoutes,
    totalDrivers,
    assignedStudents,
    routeUtilization: routes.map((r) => ({
      routeName: r.routeName,
      vehicleNumber: r.vehicle?.vehicleNumber ?? null,
      capacity: r.vehicle?.capacity ?? null,
      assigned: r._count.studentTransports,
    })),
  });
}
