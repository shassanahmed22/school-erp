import { prisma } from "@/lib/prisma";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { success, unauthorized } from "@/lib/api-response";

export async function GET() {
  const payload = await getCurrentUserFromCookies();
  if (!payload) return unauthorized("Not authenticated");

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.deletedAt) return unauthorized("User not found");

  return success({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    roles: payload.roles,
    permissions: payload.permissions,
    preferredLanguage: user.preferredLanguage,
    preferredTheme: user.preferredTheme,
  });
}
