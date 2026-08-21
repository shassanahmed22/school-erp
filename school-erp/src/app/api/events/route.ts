import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { hasRole } from "@/lib/rbac";
import { createEventSchema } from "@/lib/validators/event.validator";
import { success, created, failure } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

// Maps a viewer's roles to the event audiences they should see (mirrors announcements).
function audiencesForRoles(roles: string[]): ("ALL" | "STUDENTS" | "PARENTS" | "TEACHERS" | "STAFF")[] {
  const audiences: ("ALL" | "STUDENTS" | "PARENTS" | "TEACHERS" | "STAFF")[] = ["ALL"];
  if (roles.includes("student")) audiences.push("STUDENTS");
  if (roles.includes("parent")) audiences.push("PARENTS");
  if (roles.includes("teacher")) audiences.push("TEACHERS");
  if (roles.some((r) => !["student", "parent", "teacher"].includes(r))) audiences.push("STAFF");
  return audiences;
}

export async function GET(req: NextRequest) {
  const guard = await requirePermission("events.view");
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");

  // Default to the current month if no explicit range is given.
  const now = new Date();
  const rangeStart = startParam ? new Date(startParam) : new Date(now.getFullYear(), now.getMonth(), 1);
  const rangeEnd = endParam ? new Date(endParam) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const isPrivileged = !hasRole(guard.payload, "student") && !hasRole(guard.payload, "parent");
  const audiences = audiencesForRoles(guard.payload!.roles ?? []);

  const events = await prisma.event.findMany({
    where: {
      deletedAt: null,
      startDate: { lte: rangeEnd },
      endDate: { gte: rangeStart },
      ...(isPrivileged ? {} : { audience: { in: audiences } }),
    },
    orderBy: { startDate: "asc" },
    include: { createdBy: { select: { firstName: true, lastName: true } } },
  });

  return success(
    events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      type: e.type,
      audience: e.audience,
      startDate: e.startDate,
      endDate: e.endDate,
      isAllDay: e.isAllDay,
      startTime: e.startTime,
      endTime: e.endTime,
      location: e.location,
      createdBy: e.createdBy ? `${e.createdBy.firstName} ${e.createdBy.lastName}` : "System",
    }))
  );
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("events.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const event = await prisma.event.create({
    data: { ...parsed.data, createdById: guard.payload!.sub },
  });

  await logAudit({ userId: guard.payload!.sub, action: "CREATE", entityType: "Event", entityId: event.id, newValues: parsed.data, ipAddress, userAgent });
  await logActivity({ userId: guard.payload!.sub, type: "EVENT", description: `Added event "${event.title}"` });

  return created(event);
}
