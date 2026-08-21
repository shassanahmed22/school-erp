import { getCurrentUserFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { success, unauthorized, notFound } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const payload = await getCurrentUserFromCookies();
  if (!payload) return unauthorized();

  // Ownership check — a user may only revoke their own sessions, never
  // another account's, regardless of what id is passed in.
  const session = await prisma.userSession.findFirst({
    where: { id: params.id, userId: payload.sub },
  });
  if (!session) return notFound("Session not found");

  await prisma.userSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });

  await logAudit({ userId: payload.sub, action: "UPDATE", entityType: "UserSession", entityId: session.id, newValues: { revoked: true } });

  return success(null, "Session signed out");
}
