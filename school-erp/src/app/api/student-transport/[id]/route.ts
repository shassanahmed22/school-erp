import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { success, notFound } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("transport.delete");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.studentTransport.findUnique({
    where: { id: params.id },
    include: { student: true, route: true },
  });
  if (!existing) return notFound("Assignment not found");

  await prisma.studentTransport.update({ where: { id: params.id }, data: { status: "INACTIVE" } });

  await logAudit({ userId: guard.payload!.sub, action: "DELETE", entityType: "StudentTransport", entityId: params.id, ipAddress, userAgent });
  await logActivity({
    userId: guard.payload!.sub,
    type: "TRANSPORT",
    description: `Removed ${existing.student.firstName} ${existing.student.lastName} from route: ${existing.route.routeName}`,
  });

  return success(null, "Student unassigned from route");
}
