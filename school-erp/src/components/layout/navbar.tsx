"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Search, Bell, LogOut, User as UserIcon, Settings, Sun, Moon, Globe, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/store/ui-store";
import { useAuthStore } from "@/store/auth-store";
import { useThemeStore } from "@/store/theme-store";
import { useLanguageStore } from "@/store/language-store";
import { initials } from "@/lib/utils";
import { Breadcrumbs } from "./breadcrumbs";

export function Navbar() {
  const router = useRouter();
  const { setSidebarMobileOpen } = useUiStore();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { locale, setLocale } = useLanguageStore();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || !user.permissions.includes("messages.view")) return;
    let cancelled = false;
    async function fetchUnread() {
      try {
        const res = await fetch("/api/messages/unread-count");
        const json = await res.json();
        if (!cancelled && res.ok) setUnreadCount(json.data.unreadCount);
      } catch {
        // Non-fatal — badge simply won't update this cycle
      }
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    logout();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4">
      <button className="lg:hidden" onClick={() => setSidebarMobileOpen(true)}>
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden md:block">
        <Breadcrumbs />
      </div>

      <div className="relative flex-1 max-w-md ml-auto">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search here..." className="pl-9" />
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => setLocale(locale === "en" ? "ur" : "en")} title="Switch language">
          <Globe className="h-[18px] w-[18px]" />
        </Button>

        <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle theme">
          {theme === "light" ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {unreadCount > 0 ? (
              <DropdownMenuItem onClick={() => router.push("/messages")} className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600" />
                <span>{unreadCount} unread message{unreadCount === 1 ? "" : "s"}</span>
              </DropdownMenuItem>
            ) : (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">No new notifications</div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-accent">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{user ? initials(user.firstName, user.lastName) : "U"}</AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-left text-sm">
                <span className="block font-medium leading-none">{user?.firstName ?? "User"}</span>
                <span className="block text-xs text-muted-foreground leading-none mt-0.5">
                  {user?.roles?.[0] ?? "—"}
                </span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <UserIcon className="mr-2 h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings className="mr-2 h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
