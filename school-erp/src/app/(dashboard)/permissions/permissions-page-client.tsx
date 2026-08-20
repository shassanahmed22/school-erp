"use client";

import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Permission } from "@/types";

export function PermissionsPageClient() {
  const [grouped, setGrouped] = useState<Record<string, Permission[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/permissions")
      .then((r) => r.json())
      .then((j) => setGrouped(j.data?.grouped ?? {}))
      .finally(() => setLoading(false));
  }, []);

  const modules = Object.keys(grouped);

  return (
    <div>
      <PageHeader
        title="Permission Management"
        description="System permissions, grouped by module. Future modules register new permissions here automatically."
      />

      {loading ? (
        <Card className="p-4"><TableSkeleton rows={6} cols={3} /></Card>
      ) : modules.length === 0 ? (
        <Card><EmptyState title="No permissions found" /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((module) => (
            <Card key={module}>
              <CardHeader className="flex flex-row items-center gap-2 pb-3">
                <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  <KeyRound className="h-4.5 w-4.5 text-amber-600" />
                </div>
                <CardTitle className="text-base capitalize">{module.replace("-", " ")}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5 pt-0">
                {grouped[module].map((p) => (
                  <Badge key={p.id} variant="secondary" title={p.description ?? undefined}>
                    {p.action}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
