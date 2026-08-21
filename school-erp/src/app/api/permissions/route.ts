import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { createPermissionSchema } from "@/lib/validators/permission.validator";
import { success, created, failure } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function GET() {
  const guard = await requirePermission("permissions.view");
  if (guard.error) return guard.error;

  const permissions = await prisma.permission.findMany({
    where: { deletedAt: null },
    orderBy: [{ module: "asc" }, { action: "asc" }],
  });

  // Group by module for easier UI rendering (e.g. RoleForm's permission matrix)
  const grouped = permissions.reduce<Record<string, typeof permissions>>((acc, p) => {
    acc[p.module] = acc[p.module] ? [...acc[p.module], p] : [p];
    return acc;
  }, {});

  return success({ list: permissions, grouped });
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("permissions.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = createPermissionSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const name = `${parsed.data.module}.${parsed.data.action}`;
  const existing = await prisma.permission.findUnique({ where: { name } });
  if (existing) return failure("This permission already exists", 409);

  const permission = await prisma.permission.create({ data: { ...parsed.data, name } });

  await logAudit({ userId: guard.payload!.sub, action: "CREATE", entityType: "Permission", entityId: permission.id, newValues: permission, ipAddress, userAgent });

  return created(permission);
}
