"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Building2, Trash2, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { usePermission } from "@/hooks/use-permission";
import { toast } from "@/components/ui/toaster";
import type { DepartmentItem } from "@/types";
import { DepartmentFormDialog } from "./department-form-dialog";

export function DepartmentsTab() {
  const canCreate = usePermission("departments.create");
  const canDelete = usePermission("departments.delete");

  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DepartmentItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/departments");
      const json = await res.json();
      setDepartments(res.ok ? json.data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/departments/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Failed to delete department", description: json.message, variant: "destructive" }); return; }
      toast({ title: "Department deleted", variant: "success" });
      setDeleteTarget(null);
      fetchDepartments();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        {canCreate && (
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Department
          </Button>
        )}
      </div>

      {loading ? (
        <Card className="p-4"><TableSkeleton rows={4} cols={3} /></Card>
      ) : departments.length === 0 ? (
        <Card><EmptyState title="No departments yet" description="Create a department to start organizing staff." /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                      <Building2 className="h-4.5 w-4.5 text-blue-600" />
                    </div>
                    <p className="font-semibold text-sm">{d.name}</p>
                  </div>
                  <div className="flex gap-1">
                    {canCreate && (
                      <button onClick={() => { setEditing(d); setFormOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => setDeleteTarget(d)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{d.description || "No description"}</p>
                <div className="flex gap-2">
                  <Badge variant="secondary">{d.employeeCount ?? 0} employees</Badge>
                  <Badge variant="outline">{d.designationCount ?? 0} designations</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DepartmentFormDialog open={formOpen} onOpenChange={setFormOpen} department={editing} onSaved={fetchDepartments} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete department?"
        description={`Departments with assigned employees cannot be deleted.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
