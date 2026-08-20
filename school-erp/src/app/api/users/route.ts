import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { requirePermission } from "@/lib/api-guard";
import { createUserSchema, userQuerySchema } from "@/lib/validators/user.validator";
import { paginated, created, failure } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const guard = await requirePermission("users.view");
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const parsed = userQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return failure("Invalid query parameters", 422, parsed.error.flatten());

  const { page, limit, search, status, roleId } = parsed.data;

  const where = {
    deletedAt: null,
    ...(status && { status }),
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: "insensitive" as const } },
        { lastName: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(roleId && { userRoles: { some: { roleId } } }),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        userRoles: { select: { role: { select: { id: true, name: true } } } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const data = items.map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    phone: u.phone,
    status: u.status,
    roles: u.userRoles.map((ur) => ({ id: ur.role.id, name: ur.role.name })),
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
  }));

  return paginated(data, { page, limit, total });
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("users.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const { roleIds, password, ...rest } = parsed.data;

  const existing = await prisma.user.findFirst({ where: { email: rest.email, deletedAt: null } });
  if (existing) return failure("A user with this email already exists", 409);

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      ...rest,
      passwordHash,
      mustChangePassword: true,
      createdById: guard.payload!.sub,
      userRoles: { create: roleIds.map((roleId) => ({ roleId })) },
    },
    include: { userRoles: { include: { role: true } } },
  });

  await logAudit({
    userId: guard.payload!.sub,
    action: "CREATE",
    entityType: "User",
    entityId: user.id,
    newValues: { email: user.email, status: user.status },
    ipAddress,
    userAgent,
  });
  await logActivity({
    userId: guard.payload!.sub,
    type: "USER",
    description: `Created new user: ${user.firstName} ${user.lastName}`,
  });

  return created({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    status: user.status,
    roles: user.userRoles.map((ur) => ur.role.name),
  });
}
