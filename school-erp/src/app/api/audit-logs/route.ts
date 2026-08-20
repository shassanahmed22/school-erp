import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { paginated } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const guard = await requirePermission("audit-logs.view");
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);
  const action = searchParams.get("action") ?? undefined;

  const where = action ? { action: action as never } : {};

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const data = items.map((log) => ({
    id: log.id,
    userId: log.userId,
    userName: log.user ? `${log.user.firstName} ${log.user.lastName}` : "System",
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt,
  }));

  return paginated(data, { page, limit, total });
}
