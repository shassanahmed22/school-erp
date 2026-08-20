"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Route as RouteIcon, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { usePermission } from "@/hooks/use-permission";
import { toast } from "@/components/ui/toaster";
import type { RouteItem } from "@/types";
import { RouteFormDialog } from "./route-form-dialog";

export function RoutesTab() {
  const canCreate = usePermission("transport.create");
  const canDelete = usePermission("transport.delete");

  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RouteItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/routes");
      const json = await res.json();
      setRoutes(res.ok ? json.data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoutes(); }, [fetchRoutes]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/routes/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Failed to delete route", description: json.message, variant: "destructive" }); return; }
      toast({ title: "Route deleted", variant: "success" });
      setDeleteTarget(null);
      fetchRoutes();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        {canCreate && <Button onClick={() => setFormOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> Add Route</Button>}
      </div>

      {loading ? (
        <Card className="p-4"><TableSkeleton rows={4} cols={3} /></Card>
      ) : routes.length === 0 ? (
        <Card><EmptyState title="No routes yet" icon={<RouteIcon className="h-6 w-6 text-muted-foreground" />} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {routes.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                      <RouteIcon className="h-4.5 w-4.5 text-blue-600" />
                    </div>
                    <p className="font-semibold text-sm">{r.routeName}</p>
                  </div>
                  {canDelete && (
                    <button onClick={() => setDeleteTarget(r)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-1">{r.startPoint} → {r.endPoint}</p>
                <p className="text-xs text-muted-foreground mb-3">
                  {r.vehicleNumber ? `Vehicle: ${r.vehicleNumber}` : "No vehicle assigned"} · {r.driverName ? `Driver: ${r.driverName}` : "No driver assigned"}
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{r.assignedStudentCount ?? 0} students</Badge>
                  <span className="text-sm font-semibold">Rs. {r.monthlyFee.toLocaleString()}/mo</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RouteFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={fetchRoutes} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete route?"
        description="Routes with actively assigned students cannot be deleted."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
