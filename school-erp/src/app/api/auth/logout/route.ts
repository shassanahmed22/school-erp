import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { clearAuthCookies, getCurrentUserFromCookies, verifyRefreshToken, REFRESH_TOKEN_COOKIE } from "@/lib/auth";
import { success } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const { ipAddress, userAgent } = getRequestMeta(req);
  const currentUser = await getCurrentUserFromCookies();

  // Revoke this device's session row too, not just the cookies — otherwise
  // it would keep showing as "active" under Settings → Sessions even though
  // the user signed out, and (in principle) the refresh token could still be
  // replayed if the cookie were somehow captured before logout.
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  if (refreshToken) {
    const payload = await verifyRefreshToken(refreshToken);
    if (payload) {
      await prisma.userSession.updateMany({
        where: { tokenId: payload.jti, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  }

  await clearAuthCookies();

  if (currentUser) {
    await logAudit({ userId: currentUser.sub, action: "LOGOUT", entityType: "User", entityId: currentUser.sub, ipAddress, userAgent });
  }

  return success(null, "Logged out successfully");
}
