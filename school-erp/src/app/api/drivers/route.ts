import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { createDriverSchema } from "@/lib/validators/driver.validator";
import { success, created, failure } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function GET() {
  const guard = await requirePermission("transport.view");
  if (guard.error) return guard.error;

  const drivers = await prisma.driver.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    include: { _count: { select: { routes: true } } },
  });

  return success(
    drivers.map((d) => ({
      id: d.id,
      name: d.name,
      phone: d.phone,
      licenseNumber: d.licenseNumber,
      status: d.status,
      routeCount: d._count.routes,
    }))
  );
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("transport.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = createDriverSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.driver.findUnique({ where: { licenseNumber: parsed.data.licenseNumber } });
  if (existing) return failure("A driver with this license number already exists", 409);

  const driver = await prisma.driver.create({ data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "CREATE", entityType: "Driver", entityId: driver.id, newValues: parsed.data, ipAddress, userAgent });

  return created(driver);
}
