import { prisma } from "./prisma";
import type { JwtPayload } from "./auth";

/** Minimal shape needed for permission checks — any full JwtPayload also satisfies this. */
type PermissionCheckable = Pick<JwtPayload, "roles" | "permissions"> | null;

/**
 * Loads a user's full permission set (union across all assigned roles).
 * Used at login time to embed permissions into the JWT so that most
 * authorization checks are stateless (no DB hit) on every request.
 */
export async function loadUserPermissions(userId: string) {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          rolePermissions: { include: { permission: true } },
        },
      },
    },
  });

  const roles = userRoles.map((ur) => ur.role.slug);
  const permissionSet = new Set<string>();

  for (const ur of userRoles) {
    for (const rp of ur.role.rolePermissions) {
      permissionSet.add(rp.permission.name);
    }
  }

  return { roles, permissions: Array.from(permissionSet) };
}

/** Checks a single permission, e.g. "users.create" */
export function can(payload: PermissionCheckable, permission: string): boolean {
  if (!payload) return false;
  if (payload.roles?.includes("super-admin")) return true; // super admin bypass
  return payload.permissions?.includes(permission) ?? false;
}

/** Checks any of the given permissions */
export function canAny(payload: PermissionCheckable, permissions: string[]): boolean {
  return permissions.some((p) => can(payload, p));
}

/** Checks all of the given permissions */
export function canAll(payload: PermissionCheckable, permissions: string[]): boolean {
  return permissions.every((p) => can(payload, p));
}

/** Checks whether the user has a given role slug */
export function hasRole(payload: PermissionCheckable, roleSlug: string): boolean {
  return payload?.roles?.includes(roleSlug) ?? false;
}
