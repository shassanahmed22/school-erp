import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword, signAccessToken, signRefreshToken, setAuthCookies,
  generateSecureToken, MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_MS,
} from "@/lib/auth";
import { loadUserPermissions } from "@/lib/rbac";
import { checkIpLoginRateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validators/auth.validator";
import { success, failure, unauthorized, serverError } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const { ipAddress, userAgent } = getRequestMeta(req);

  const ipCheck = checkIpLoginRateLimit(ipAddress);
  if (!ipCheck.allowed) {
    await logAudit({ action: "LOGIN_FAILED", entityType: "User", ipAddress, userAgent, newValues: { reason: "ip_rate_limited" } });
    return failure(`Too many login attempts from this network. Try again in ${Math.ceil((ipCheck.retryAfterSeconds ?? 0) / 60)} minute(s).`, 429);
  }

  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return failure("Validation failed", 422, parsed.error.flatten());
    }
    const { email, password, rememberMe } = parsed.data;

    const user = await prisma.user.findFirst({ where: { email, deletedAt: null } });

    // Always return the same generic message for "no such user" vs "wrong password"
    // so a caller can't enumerate which emails have accounts.
    if (!user) {
      await logAudit({ action: "LOGIN_FAILED", entityType: "User", ipAddress, userAgent, newValues: { email } });
      return unauthorized("Invalid email or password");
    }

    // Account locked from too many recent failed attempts
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      await logAudit({ userId: user.id, action: "LOGIN_FAILED", entityType: "User", entityId: user.id, ipAddress, userAgent, newValues: { reason: "account_locked" } });
      return unauthorized(`Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`);
    }

    if (user.status !== "ACTIVE") {
      return unauthorized(`Account is ${user.status.toLowerCase()}. Contact your administrator.`);
    }

    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      const attempts = user.failedLoginAttempts + 1;
      const lockingNow = attempts >= MAX_LOGIN_ATTEMPTS;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: lockingNow ? 0 : attempts,
          lockedUntil: lockingNow ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
        },
      });

      await logAudit({ userId: user.id, action: "LOGIN_FAILED", entityType: "User", entityId: user.id, ipAddress, userAgent, newValues: { attempts } });

      if (lockingNow) {
        return unauthorized(`Too many failed attempts. Account locked for ${LOCKOUT_DURATION_MS / 60000} minutes.`);
      }
      return unauthorized("Invalid email or password");
    }

    // Successful password check — clear any lockout state
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null } });
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
    const sessionTokenId = generateSecureToken();
    const refreshExpiresIn = rememberMe ? "30d" : "7d";
    const refreshExpiresAt = new Date(Date.now() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000);
    const refreshToken = await signRefreshToken(
      { sub: user.id, tokenVersion: user.tokenVersion, jti: sessionTokenId },
      refreshExpiresIn
    );

    await setAuthCookies(accessToken, refreshToken, rememberMe);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), lastLoginIp: ipAddress },
      }),
      prisma.userSession.create({
        data: {
          userId: user.id,
          tokenId: sessionTokenId,
          userAgent,
          ipAddress,
          expiresAt: refreshExpiresAt,
        },
      }),
    ]);

    await logAudit({ userId: user.id, action: "LOGIN", entityType: "User", entityId: user.id, ipAddress, userAgent });

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
    }, "Logged in successfully");
  } catch (err) {
    console.error("Login error:", err);
    return serverError("Login failed. Please try again.");
  }
}
