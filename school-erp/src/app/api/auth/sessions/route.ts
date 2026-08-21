import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromCookies, verifyRefreshToken, REFRESH_TOKEN_COOKIE } from "@/lib/auth";
import { success, unauthorized } from "@/lib/api-response";

export async function GET() {
  const payload = await getCurrentUserFromCookies();
  if (!payload) return unauthorized();

  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  const currentTokenPayload = refreshToken ? await verifyRefreshToken(refreshToken) : null;

  const sessions = await prisma.userSession.findMany({
    where: { userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastUsedAt: "desc" },
  });

  return success(
    sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      lastUsedAt: s.lastUsedAt,
      isCurrent: currentTokenPayload?.jti === s.tokenId,
    }))
  );
}
