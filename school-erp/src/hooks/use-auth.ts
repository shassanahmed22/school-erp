"use client";
import { useAuthStore } from "@/store/auth-store";

/** Convenience hook exposing the current session user + loading state. */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  return { user, isLoading, isAuthenticated: !!user };
}
