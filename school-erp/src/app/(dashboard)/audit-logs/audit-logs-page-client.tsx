"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import type { AuditLogItem } from "@/types";

const actionVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  LOGIN: "success",
  LOGOUT: "secondary",
  LOGIN_FAILED: "destructive",
  CREATE: "success",
  UPDATE: "warning",
  DELETE: "destructive",
  RESTORE: "secondary",
  PASSWORD_CHANGE: "warning",
  PASSWORD_RESET: "warning",
  PERMISSION_CHANGE: "warning",
  ROLE_CHANGE: "warning",
  SETTINGS_CHANGE: "secondary",
};

export function AuditLogsPageClient() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/audit-logs?page=${page}&limit=15`)
      .then((r) => r.json())
      .then((j) => {
        setLogs(j.data ?? []);
        setTotalPages(j.pagination?.totalPages ?? 1);
      })
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Security-relevant events: logins, permission changes, and data modifications."
      />

      <Card className="p-4">
        {loading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : logs.length === 0 ? (
          <EmptyState title="No audit events yet" description="Actions like logins and edits will appear here." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.userName ?? "System"}</TableCell>
                    <TableCell><Badge variant={actionVariant[log.action] ?? "secondary"}>{log.action}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.entityType ? `${log.entityType}${log.entityId ? ` #${log.entityId.slice(0, 8)}` : ""}` : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{log.ipAddress ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between mt-4">
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
