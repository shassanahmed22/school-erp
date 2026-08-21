"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/store/theme-store";
import { useLanguageStore } from "@/store/language-store";
import { useAuthStore } from "@/store/auth-store";
import { Toaster } from "@/components/ui/toaster";

// Access tokens are short-lived (15 min) by design — this keeps the session
// alive transparently while the user is active, and re-reads fresh
// permissions from the database on every refresh (see /api/auth/refresh).
// If the refresh ever fails (account suspended/deleted, password changed
// elsewhere, refresh token expired), the user is signed out client-side too.
const SILENT_REFRESH_INTERVAL_MS = 12 * 60 * 1000; // refresh before the 15-min token expires

export function AppProviders({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  const { locale, direction } = useLanguageStore();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const logout = useAuthStore((s) => s.logout);

  // Apply theme class to <html>
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Apply language/direction to <html>
  useEffect(() => {
    document.documentElement.setAttribute("lang", locale);
    document.documentElement.setAttribute("dir", direction);
  }, [locale, direction]);

  // Fetch current session on mount
  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (active) setUser(json?.data ?? null);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [setUser, setLoading]);

  // Silent background token refresh while signed in
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/auth/refresh", { method: "POST" });
        if (!res.ok) {
          logout();
          window.location.href = "/login";
          return;
        }
        const json = await res.json();
        setUser(json?.data?.user ?? null);
      } catch {
        // Network hiccup — don't sign the user out on a single failed refresh;
        // the next interval tick (or a 401 from a real API call) will handle it.
      }
    }, SILENT_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user, setUser, logout]);

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
