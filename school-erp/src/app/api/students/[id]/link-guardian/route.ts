import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { z } from "zod";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

const linkGuardianSchema = z.object({
  guardianId: z.string().uuid(),
  parentEmail: z.string().email().nullable(), // null unlinks
});

/**
 * Links (or unlinks, when parentEmail is null) a guardian contact record to
 * an actual "parent" role login account. This is what makes parent-portal
 * data scoping (results, fees, attendance) actually resolve to the right
 * children instead of an unlinked/empty account.
 */
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("students.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = linkGuardianSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const guardian = await prisma.guardian.findFirst({
    where: { id: parsed.data.guardianId, studentId: params.id },
  });
  if (!guardian) return notFound("Guardian record not found for this student");

  if (parsed.data.parentEmail === null) {
    await prisma.guardian.update({ where: { id: guardian.id }, data: { userId: null } });
    await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "Guardian", entityId: guardian.id, newValues: { userId: null }, ipAddress, userAgent });
    return success(null, "Parent account unlinked");
  }

  const parentUser = await prisma.user.findFirst({
    where: { email: parsed.data.parentEmail, deletedAt: null },
    include: { userRoles: { include: { role: true } } },
  });
  if (!parentUser) return failure("No account found with that email", 404);

  const isParentRole = parentUser.userRoles.some((ur) => ur.role.slug === "parent");
  if (!isParentRole) {
    return failure("That account does not have the Parent role — assign the Parent role first", 422);
  }

  await prisma.guardian.update({ where: { id: guardian.id }, data: { userId: parentUser.id } });
  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "Guardian", entityId: guardian.id, newValues: { userId: parentUser.id }, ipAddress, userAgent });

  return success(null, "Parent account linked successfully");
}
