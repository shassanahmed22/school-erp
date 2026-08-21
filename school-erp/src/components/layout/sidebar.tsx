"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, ShieldCheck, KeyRound, Settings, FileClock,
  Activity, GraduationCap, ChevronLeft, X, Presentation, Layers, BookOpen,
  CalendarCheck, ClipboardList, Trophy, Wallet, Briefcase, Banknote, Library, Bus,
  Boxes, MessageSquare, Megaphone, CalendarDays, ClipboardCheck, CalendarRange,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import { useAuthStore } from "@/store/auth-store";
import { can } from "@/lib/rbac";
import { NAV_ITEMS } from "./nav-config";

const ICONS: Record<string, React.ElementType> = {
  LayoutDashboard, Users, ShieldCheck, KeyRound, Settings, FileClock, Activity,
  GraduationCap, Presentation, Layers, BookOpen, CalendarCheck, ClipboardList, Trophy, Wallet, Briefcase, Banknote, Library, Bus,
  Boxes, MessageSquare, Megaphone, CalendarDays, ClipboardCheck, CalendarRange,
};

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, sidebarMobileOpen, setSidebarMobileOpen } = useUiStore();
  const { user } = useAuthStore();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.permission || can({ roles: user?.roles ?? [], permissions: user?.permissions ?? [] }, item.permission)
  );

  return (
    <>
      {/* Mobile overlay */}
      {sidebarMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-[#0f1729] text-slate-200 transition-all duration-200 lg:static lg:z-0",
          sidebarCollapsed ? "w-[76px]" : "w-64",
          sidebarMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-white/10">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <span className="font-semibold text-white whitespace-nowrap">Bright Future School</span>
            )}
          </div>
          <button className="lg:hidden" onClick={() => setSidebarMobileOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <p className={cn("px-2 text-xs font-semibold uppercase text-slate-500 mt-2 mb-1", sidebarCollapsed && "text-center")}>
            {sidebarCollapsed ? "•" : "Main"}
          </p>
          {visibleItems.map((item) => {
            const Icon = ICONS[item.icon] ?? LayoutDashboard;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={toggleSidebar}
          className="hidden lg:flex items-center justify-center gap-2 border-t border-white/10 py-3 text-slate-400 hover:text-white text-xs"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", sidebarCollapsed && "rotate-180")} />
          {!sidebarCollapsed && "Collapse"}
        </button>
      </aside>
    </>
  );
}
