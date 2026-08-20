import { prisma } from "@/lib/prisma";
import {
  verifyRefreshToken, signAccessToken, signRefreshToken, setAuthCookies, clearAuthCookies,
  generateSecureToken, REFRESH_TOKEN_COOKIE,
} from "@/lib/auth";
import { loadUserPermissions } from "@/lib/rbac";
import { success, unauthorized } from "@/lib/api-response";
import { cookies } from "next/headers";

/**
 * Reissues a short-lived access token from a still-valid refresh token.
 *
 * This is also where "permission changes take effect" and "session revocation"
 * actually happen in this stateless-JWT design: every refresh (at most every
 * 15 minutes, since that's the access token lifetime) re-reads the user's
 * current roles/permissions from the database rather than trusting the old
 * token, and rejects the refresh entirely if the account was suspended,
 * deleted, the password was changed elsewhere (tokenVersion mismatch), or
 * this specific device's session was individually revoked from Settings →
 * Sessions on another device.
 */
export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) return unauthorized("No refresh token");

  const refreshPayload = await verifyRefreshToken(refreshToken);
  if (!refreshPayload) {
    await clearAuthCookies();
    return unauthorized("Refresh token invalid or expired");
  }

  const [user, session] = await Promise.all([
    prisma.user.findUnique({ where: { id: refreshPayload.sub } }),
    prisma.userSession.findUnique({ where: { tokenId: refreshPayload.jti } }),
  ]);

  if (!user || user.deletedAt || user.status !== "ACTIVE") {
    await clearAuthCookies();
    return unauthorized("Account is no longer active");
  }

  // A password change (or an admin-triggered forced logout) bumps tokenVersion,
  // which immediately invalidates every refresh token issued before that point.
  if (refreshPayload.tokenVersion !== user.tokenVersion) {
    await clearAuthCookies();
    return unauthorized("Session has expired, please log in again");
  }

  // This specific device was individually revoked (or the session row is
  // simply gone / expired) — reject even though the JWT signature itself is
  // still technically valid.
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    await clearAuthCookies();
    return unauthorized("This session has been signed out");
  }

  const { roles, permissions } = await loadUserPermissions(user.id);

  const accessToken = await signAccessToken({
    sub: user.id,
    email: user.email,
    roles,
    permissions,
    tokenVersion: user.tokenVersion,
    mustChangePassword: user.mustChangePassword,
  });

  // Rotate the refresh token too, preserving its original remember-me duration
  // (inferred from how far in the future its expiry was set, since we don't
  // store that choice anywhere else in this stateless design). The
  // UserSession row is updated in place (same row, new tokenId) rather than
  // creating a new row every ~12 minutes, so the sessions list stays one
  // entry per device instead of growing unbounded.
  const originalLifetimeDays = (refreshPayload.exp - refreshPayload.iat) / 86400;
  const wasRememberMe = originalLifetimeDays > 10; // 30d remember-me vs 7d default
  const newTokenId = generateSecureToken();
  const newExpiresAt = new Date(Date.now() + (wasRememberMe ? 30 : 7) * 24 * 60 * 60 * 1000);
  const newRefreshToken = await signRefreshToken(
    { sub: user.id, tokenVersion: user.tokenVersion, jti: newTokenId },
    wasRememberMe ? "30d" : "7d"
  );

  await setAuthCookies(accessToken, newRefreshToken, wasRememberMe);
  await prisma.userSession.update({
    where: { id: session.id },
    data: { tokenId: newTokenId, expiresAt: newExpiresAt, lastUsedAt: new Date() },
  });

  return success({
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      roles,
      permissions,
      preferredLanguage: user.preferredLanguage,
      preferredTheme: user.preferredTheme,
      mustChangePassword: user.mustChangePassword,
    },
  }, "Session refreshed");
}
