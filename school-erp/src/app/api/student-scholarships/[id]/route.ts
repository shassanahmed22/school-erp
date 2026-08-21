import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { success, notFound } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("scholarships.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const existing = await prisma.studentScholarship.findUnique({ where: { id: params.id } });
  if (!existing) return notFound("Assignment not found");

  await prisma.studentScholarship.delete({ where: { id: params.id } });
  await logAudit({ userId: guard.payload!.sub, action: "DELETE", entityType: "StudentScholarship", entityId: params.id, ipAddress, userAgent });

  return success(null, "Scholarship removed from student");
}
