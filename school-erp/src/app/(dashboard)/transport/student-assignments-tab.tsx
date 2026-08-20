"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ExportButtons } from "@/components/shared/export-buttons";
import { usePermission } from "@/hooks/use-permission";
import { toast } from "@/components/ui/toaster";
import type { StudentTransportItem, RouteItem } from "@/types";
import { formatDate } from "@/lib/utils";
import { AssignTransportDialog } from "./assign-transport-dialog";

export function StudentAssignmentsTab() {
  const canCreate = usePermission("transport.create");
  const canDelete = usePermission("transport.delete");

  const [rows, setRows] = useState<StudentTransportItem[]>([]);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [routeFilter, setRouteFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [assignOpen, setAssignOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<StudentTransportItem | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => { fetch("/api/routes").then((r) => r.json()).then((j) => setRoutes(j.data ?? [])); }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15", status: "ACTIVE" });
      if (search) params.set("search", search);
      if (routeFilter !== "ALL") params.set("routeId", routeFilter);
      const res = await fetch(`/api/student-transport?${params}`);
      const json = await res.json();
      setRows(res.ok ? json.data : []);
      setTotalPages(json.pagination?.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  }, [search, routeFilter, page]);

  useEffect(() => {
    const t = setTimeout(fetchRows, 300);
    return () => clearTimeout(t);
  }, [fetchRows]);

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/student-transport/${removeTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Failed to remove assignment", description: json.message, variant: "destructive" }); return; }
      toast({ title: "Student unassigned", variant: "success" });
      setRemoveTarget(null);
      fetchRows();
    } finally {
      setRemoving(false);
    }
  }

  const exportRows = rows.map((r) => [r.registrationNumber, r.studentName, r.routeName, r.monthlyFee, formatDate(r.assignedDate)]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search student..." className="pl-9" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
          </div>
          <Select value={routeFilter} onValueChange={(v) => { setRouteFilter(v); setPage(1); }}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Routes</SelectItem>
              {routes.map((r) => <SelectItem key={r.id} value={r.id}>{r.routeName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <ExportButtons filename="transport-assignments" headers={["Reg #", "Student", "Route", "Monthly Fee", "Assigned Date"]} rows={exportRows} />
          {canCreate && <Button onClick={() => setAssignOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> Assign Student</Button>}
        </div>
      </div>

      <Card className="p-4">
        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : rows.length === 0 ? (
          <EmptyState title="No students assigned yet" description="Assign a student to a transport route." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Monthly Fee</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  {canDelete && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <p className="font-medium">{r.studentName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{r.registrationNumber}</p>
                    </TableCell>
                    <TableCell>{r.routeName}</TableCell>
                    <TableCell>Rs. {r.monthlyFee.toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(r.assignedDate)}</TableCell>
                    {canDelete && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setRemoveTarget(r)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <AssignTransportDialog open={assignOpen} onOpenChange={setAssignOpen} routes={routes} onSaved={fetchRows} />

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        title="Remove from route?"
        description={`This will unassign ${removeTarget?.studentName} from ${removeTarget?.routeName}.`}
        onConfirm={handleRemove}
        loading={removing}
      />
    </div>
  );
}
