"use client";
import { useAuthStore } from "@/store/auth-store";

/** Client-side permission check, mirrors lib/rbac.ts#can for UI gating (buttons, nav, etc). */
export function usePermission(permission: string): boolean {
  const user = useAuthStore((s) => s.user);
  if (!user) return false;
  if (user.roles.includes("super-admin")) return true;
  return user.permissions.includes(permission);
}

export function useAnyPermission(permissions: string[]): boolean {
  const user = useAuthStore((s) => s.user);
  if (!user) return false;
  if (user.roles.includes("super-admin")) return true;
  return permissions.some((p) => user.permissions.includes(p));
}
