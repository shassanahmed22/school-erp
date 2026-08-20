import { getCurrentUserFromCookies } from "./auth";
import { can } from "./rbac";
import { forbidden, unauthorized } from "./api-response";

/**
 * Ensures the request is authenticated and, optionally, that the caller
 * holds a specific permission. Returns either the JWT payload or a
 * pre-built NextResponse to return immediately from the route handler.
 */
export async function requirePermission(permission?: string) {
  const payload = await getCurrentUserFromCookies();
  if (!payload) return { error: unauthorized() } as const;
  if (permission && !can(payload, permission)) {
    return { error: forbidden(`Missing permission: ${permission}`) } as const;
  }
  return { payload } as const;
}
