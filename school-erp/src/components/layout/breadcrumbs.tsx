"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Link href="/dashboard" className="flex items-center hover:text-foreground">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {segments.map((seg, idx) => {
        const href = "/" + segments.slice(0, idx + 1).join("/");
        const label = seg.replace(/-/g, " ");
        const isLast = idx === segments.length - 1;
        return (
          <span key={href} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5" />
            {isLast ? (
              <span className="font-medium text-foreground capitalize">{label}</span>
            ) : (
              <Link href={href} className="capitalize hover:text-foreground">{label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
