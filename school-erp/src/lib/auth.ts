import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

// ----------------------------------------------------------------------------
// Password hashing
// ----------------------------------------------------------------------------

const SALT_ROUNDS = 12;

// ----------------------------------------------------------------------------
// Brute-force lockout policy
// ----------------------------------------------------------------------------

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ----------------------------------------------------------------------------
// JWT (access + refresh) via `jose` — Edge runtime compatible for middleware
// ----------------------------------------------------------------------------

export interface JwtPayload {
  sub: string; // user id
  email: string;
  roles: string[];
  permissions: string[];
  tokenVersion: number; // bumped on password change / forced logout — invalidates older tokens on refresh
  mustChangePassword?: boolean;
  [key: string]: unknown;
}

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me"
);
const REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me"
);

export const ACCESS_TOKEN_COOKIE = "erp_access_token";
export const REFRESH_TOKEN_COOKIE = "erp_refresh_token";

export async function signAccessToken(payload: JwtPayload, expiresIn = "15m") {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(ACCESS_SECRET);
}

export async function signRefreshToken(
  payload: { sub: string; tokenVersion: number; jti: string },
  expiresIn = "7d"
) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(REFRESH_SECRET);
}

export async function verifyAccessToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<{ sub: string; tokenVersion: number; jti: string; iat: number; exp: number } | null> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET);
    return payload as unknown as { sub: string; tokenVersion: number; jti: string; iat: number; exp: number };
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// Cookie helpers (httpOnly, secure, sameSite=lax — CSRF-resistant by default)
// ----------------------------------------------------------------------------

export async function setAuthCookies(
  accessToken: string,
  refreshToken: string,
  rememberMe = false
) {
  const cookieStore = await cookies();
  const secure = process.env.COOKIE_SECURE === "true";

  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60, // 15 minutes
  });

  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60, // 30d or 7d
  });
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}

export async function getCurrentUserFromCookies(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifyAccessToken(token);
}

// ----------------------------------------------------------------------------
// Secure random tokens (password reset, remember-me)
// ----------------------------------------------------------------------------

export function generateSecureToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * One-way hash for high-entropy random tokens (password reset links, etc).
 * Unlike user passwords, these tokens are already 256 bits of randomness, so a
 * fast SHA-256 digest (not bcrypt) is appropriate — it still means a database
 * leak alone can't be used to log in or reset a password, since only the hash
 * is stored and the raw token only ever exists in the emailed link.
 */
export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
