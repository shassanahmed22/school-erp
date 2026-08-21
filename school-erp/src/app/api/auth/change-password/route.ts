import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema } from "@/lib/validators/auth.validator";
import {
  getCurrentUserFromCookies, hashPassword, verifyPassword,
  signAccessToken, signRefreshToken, setAuthCookies, generateSecureToken,
} from "@/lib/auth";
import { loadUserPermissions } from "@/lib/rbac";
import { success, failure, unauthorized } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const { ipAddress, userAgent } = getRequestMeta(req);
  const payload = await getCurrentUserFromCookies();
  if (!payload) return unauthorized();

  const body = await req.json();
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) return unauthorized("User not found");

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return failure("Current password is incorrect", 400);

  const passwordHash = await hashPassword(parsed.data.newPassword);

  // Bumping tokenVersion invalidates every refresh token issued before this
  // moment (e.g. on another device) — combined with wiping the session rows,
  // every other device is forced to re-authenticate. This device gets a
  // freshly issued pair (and a fresh session row) below so the user stays
  // signed in here.
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      mustChangePassword: false,
      tokenVersion: { increment: 1 },
    },
  });
  await prisma.userSession.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  const { roles, permissions } = await loadUserPermissions(user.id);
  const accessToken = await signAccessToken({
    sub: user.id,
    email: user.email,
    roles,
    permissions,
    tokenVersion: updated.tokenVersion,
    mustChangePassword: false,
  });
  const sessionTokenId = generateSecureToken();
  const refreshToken = await signRefreshToken({ sub: user.id, tokenVersion: updated.tokenVersion, jti: sessionTokenId });
  await setAuthCookies(accessToken, refreshToken);
  await prisma.userSession.create({
    data: {
      userId: user.id,
      tokenId: sessionTokenId,
      userAgent,
      ipAddress,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await logAudit({ userId: user.id, action: "PASSWORD_CHANGE", entityType: "User", entityId: user.id, ipAddress, userAgent });

  return success(null, "Password changed successfully");
}
