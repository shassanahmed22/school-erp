import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { assignTransportSchema, studentTransportQuerySchema } from "@/lib/validators/student-transport.validator";
import { paginated, created, unauthorized, failure } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const payload = await getCurrentUserFromCookies();
  if (!payload) return unauthorized();

  const { searchParams } = new URL(req.url);
  const parsed = studentTransportQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return failure("Invalid query parameters", 422, parsed.error.flatten());

  const { routeId, status, search, page, limit } = parsed.data;
  let studentId: string | undefined;

  if (hasRole(payload, "student") && !hasRole(payload, "super-admin")) {
    const student = await prisma.student.findUnique({ where: { userId: payload.sub } });
    if (!student) return paginated([], { page, limit, total: 0 });
    studentId = student.id;
  } else {
    const guard = await requirePermission("transport.view");
    if (guard.error) return guard.error;
  }

  const where = {
    ...(studentId && { studentId }),
    ...(routeId && { routeId }),
    ...(status && { status }),
    ...(search && {
      student: {
        OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          { registrationNumber: { contains: search, mode: "insensitive" as const } },
        ],
      },
    }),
  };

  const [items, total] = await Promise.all([
    prisma.studentTransport.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { assignedDate: "desc" },
      include: {
        student: { select: { firstName: true, lastName: true, registrationNumber: true } },
        route: { select: { routeName: true, monthlyFee: true } },
      },
    }),
    prisma.studentTransport.count({ where }),
  ]);

  const data = items.map((t) => ({
    id: t.id,
    studentId: t.studentId,
    studentName: `${t.student.firstName} ${t.student.lastName}`,
    registrationNumber: t.student.registrationNumber,
    routeId: t.routeId,
    routeName: t.route.routeName,
    monthlyFee: Number(t.route.monthlyFee),
    assignedDate: t.assignedDate,
    status: t.status,
  }));

  return paginated(data, { page, limit, total });
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("transport.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = assignTransportSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const { studentId, routeId } = parsed.data;

  const [student, route] = await Promise.all([
    prisma.student.findFirst({ where: { id: studentId, deletedAt: null } }),
    prisma.route.findFirst({ where: { id: routeId, deletedAt: null } }),
  ]);
  if (!student) return failure("Student not found", 404);
  if (!route) return failure("Route not found", 404);

  const existing = await prisma.studentTransport.findUnique({ where: { studentId_routeId: { studentId, routeId } } });
  if (existing) {
    if (existing.status === "ACTIVE") return failure("Student is already assigned to this route", 409);
    const reactivated = await prisma.studentTransport.update({ where: { id: existing.id }, data: { status: "ACTIVE", assignedDate: new Date() } });
    return created(reactivated);
  }

  const assignment = await prisma.studentTransport.create({
    data: { studentId, routeId, assignedById: guard.payload!.sub },
  });

  await logAudit({
    userId: guard.payload!.sub,
    action: "CREATE",
    entityType: "StudentTransport",
    entityId: assignment.id,
    newValues: { studentId, routeId },
    ipAddress,
    userAgent,
  });
  await logActivity({
    userId: guard.payload!.sub,
    type: "TRANSPORT",
    description: `Assigned ${student.firstName} ${student.lastName} to route: ${route.routeName}`,
  });

  return created(assignment);
}
