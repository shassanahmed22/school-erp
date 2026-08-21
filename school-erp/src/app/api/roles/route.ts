import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { createRoleSchema } from "@/lib/validators/role.validator";
import { success, created, failure } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function GET() {
  const guard = await requirePermission("roles.view");
  if (guard.error) return guard.error;

  const roles = await prisma.role.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    include: {
      rolePermissions: { include: { permission: true } },
      _count: { select: { userRoles: true } },
    },
  });

  return success(
    roles.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      isSystem: r.isSystem,
      userCount: r._count.userRoles,
      permissions: r.rolePermissions.map((rp) => rp.permission),
    }))
  );
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("roles.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = createRoleSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const { permissionIds, ...rest } = parsed.data;
  const slug = rest.name.toLowerCase().trim().replace(/\s+/g, "-");

  const existing = await prisma.role.findFirst({ where: { OR: [{ name: rest.name }, { slug }] } });
  if (existing) return failure("A role with this name already exists", 409);

  const role = await prisma.role.create({
    data: {
      ...rest,
      slug,
      rolePermissions: { create: permissionIds.map((permissionId) => ({ permissionId })) },
    },
  });

  await logAudit({ userId: guard.payload!.sub, action: "CREATE", entityType: "Role", entityId: role.id, newValues: rest, ipAddress, userAgent });
  await logActivity({ userId: guard.payload!.sub, type: "ROLE", description: `Created new role: ${role.name}` });

  return created(role);
}
