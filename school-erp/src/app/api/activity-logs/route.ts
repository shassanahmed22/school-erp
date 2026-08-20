import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { paginated } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const guard = await requirePermission("activity-logs.view");
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);

  const [items, total] = await Promise.all([
    prisma.activityLog.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { firstName: true, lastName: true } } },
    }),
    prisma.activityLog.count(),
  ]);

  const data = items.map((log) => ({
    id: log.id,
    userId: log.userId,
    userName: log.user ? `${log.user.firstName} ${log.user.lastName}` : "System",
    type: log.type,
    description: log.description,
    createdAt: log.createdAt,
  }));

  return paginated(data, { page, limit, total });
}
