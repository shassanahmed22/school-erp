import { redirect } from "next/navigation";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { can, canAny } from "@/lib/rbac";
import type { JwtPayload } from "@/lib/auth";

/**
 * Server-side guard for entire pages. Call this at the top of a Server
 * Component `page.tsx` — it runs before any markup (including the client
 * bundle for the protected UI) is ever sent to the browser, so hiding a
 * sidebar link is not what actually keeps someone out: this is.
 *
 * - Not authenticated -> redirect to /login
 * - Authenticated but missing the permission -> redirect to /forbidden
 * - Otherwise -> returns the JWT payload so the caller can pass it down if needed
 *
 * Accepts a single permission or a list (any-of).
 */
export async function requirePagePermission(permission: string | string[]): Promise<JwtPayload> {
  const payload = await getCurrentUserFromCookies();
  if (!payload) {
    redirect("/login");
  }

  const authorized = Array.isArray(permission)
    ? canAny(payload, permission)
    : can(payload, permission);

  if (!authorized) {
    redirect("/forbidden");
  }

  return payload;
}
