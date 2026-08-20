"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, User, ShieldCheck, KeyRound, Cog, LogIn, Server } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ActivityLogItem } from "@/types";
import { cn } from "@/lib/utils";

const typeIcon: Record<string, React.ElementType> = {
  USER: User,
  ROLE: ShieldCheck,
  PERMISSION: KeyRound,
  SETTINGS: Cog,
  AUTH: LogIn,
  SYSTEM: Server,
};

const typeColor: Record<string, string> = {
  USER: "bg-blue-100 text-blue-600 dark:bg-blue-900/40",
  ROLE: "bg-purple-100 text-purple-600 dark:bg-purple-900/40",
  PERMISSION: "bg-amber-100 text-amber-600 dark:bg-amber-900/40",
  SETTINGS: "bg-slate-100 text-slate-600 dark:bg-slate-800",
  AUTH: "bg-green-100 text-green-600 dark:bg-green-900/40",
  SYSTEM: "bg-pink-100 text-pink-600 dark:bg-pink-900/40",
};

export function ActivityLogsPageClient() {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/activity-logs?page=${page}&limit=15`)
      .then((r) => r.json())
      .then((j) => {
        setLogs(j.data ?? []);
        setTotalPages(j.pagination?.totalPages ?? 1);
      })
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div>
      <PageHeader title="Activity Logs" description="A running timeline of major actions taken across the system." />

      <Card className="p-6">
        {loading ? (
          <TableSkeleton rows={8} cols={2} />
        ) : logs.length === 0 ? (
          <EmptyState title="No activity yet" description="System activity will show up here as it happens." />
        ) : (
          <>
            <ol className="relative border-l pl-6 space-y-6">
              {logs.map((log) => {
                const Icon = typeIcon[log.type] ?? Server;
                return (
                  <li key={log.id} className="relative">
                    <span
                      className={cn(
                        "absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full",
                        typeColor[log.type] ?? "bg-slate-100 text-slate-600"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <p className="text-sm font-medium">{log.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {log.userName ?? "System"} · {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </li>
                );
              })}
            </ol>

            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
