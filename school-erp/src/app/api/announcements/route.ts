import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { hasRole } from "@/lib/rbac";
import { createAnnouncementSchema } from "@/lib/validators/announcement.validator";
import { success, created, failure } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

// Maps a viewer's roles to the announcement audiences they should see.
function audiencesForRoles(roles: string[]): ("ALL" | "STUDENTS" | "PARENTS" | "TEACHERS" | "STAFF")[] {
  const audiences: ("ALL" | "STUDENTS" | "PARENTS" | "TEACHERS" | "STAFF")[] = ["ALL"];
  if (roles.includes("student")) audiences.push("STUDENTS");
  if (roles.includes("parent")) audiences.push("PARENTS");
  if (roles.includes("teacher")) audiences.push("TEACHERS");
  if (roles.some((r) => !["student", "parent", "teacher"].includes(r))) audiences.push("STAFF");
  return audiences;
}

export async function GET() {
  const guard = await requirePermission("announcements.view");
  if (guard.error) return guard.error;

  const now = new Date();
  const isPrivileged = !hasRole(guard.payload, "student") && !hasRole(guard.payload, "parent");
  const audiences = audiencesForRoles(guard.payload!.roles ?? []);

  const announcements = await prisma.announcement.findMany({
    where: {
      deletedAt: null,
      ...(isPrivileged ? {} : { audience: { in: audiences }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }),
    },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    include: { publishedBy: { select: { firstName: true, lastName: true } } },
  });

  return success(
    announcements.map((a) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      audience: a.audience,
      isPinned: a.isPinned,
      expiresAt: a.expiresAt,
      createdAt: a.createdAt,
      publishedBy: a.publishedBy ? `${a.publishedBy.firstName} ${a.publishedBy.lastName}` : "System",
    }))
  );
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("announcements.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = createAnnouncementSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const announcement = await prisma.announcement.create({
    data: { ...parsed.data, publishedById: guard.payload!.sub },
  });

  await logAudit({ userId: guard.payload!.sub, action: "CREATE", entityType: "Announcement", entityId: announcement.id, newValues: parsed.data, ipAddress, userAgent });
  await logActivity({ userId: guard.payload!.sub, type: "ANNOUNCEMENT", description: `Published announcement "${announcement.title}"` });

  return created(announcement);
}
