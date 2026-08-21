"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Tag, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { usePermission } from "@/hooks/use-permission";
import { toast } from "@/components/ui/toaster";
import type { DesignationItem, DepartmentItem } from "@/types";
import { DesignationFormDialog } from "./designation-form-dialog";

export function DesignationsTab() {
  const canCreate = usePermission("departments.create");
  const canDelete = usePermission("departments.delete");

  const [designations, setDesignations] = useState<DesignationItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DesignationItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetch("/api/departments").then((r) => r.json()).then((j) => setDepartments(j.data ?? [])); }, []);

  const fetchDesignations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (departmentFilter !== "ALL") params.set("departmentId", departmentFilter);
      const res = await fetch(`/api/designations?${params}`);
      const json = await res.json();
      setDesignations(res.ok ? json.data : []);
    } finally {
      setLoading(false);
    }
  }, [departmentFilter]);

  useEffect(() => { fetchDesignations(); }, [fetchDesignations]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/designations/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Failed to delete designation", description: json.message, variant: "destructive" }); return; }
      toast({ title: "Designation deleted", variant: "success" });
      setDeleteTarget(null);
      fetchDesignations();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Departments</SelectItem>
            {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {canCreate && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Designation
          </Button>
        )}
      </div>

      <Card className="p-4">
        {loading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : designations.length === 0 ? (
          <EmptyState title="No designations yet" description="Add a designation within a department." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Employees</TableHead>
                {canDelete && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {designations.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{d.title}</span>
                    </div>
                  </TableCell>
                  <TableCell>{d.departmentName}</TableCell>
                  <TableCell><Badge variant="secondary">{d.employeeCount ?? 0}</Badge></TableCell>
                  {canDelete && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(d)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <DesignationFormDialog open={formOpen} onOpenChange={setFormOpen} departments={departments} onSaved={fetchDesignations} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete designation?"
        description="Designations with assigned employees cannot be deleted."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
