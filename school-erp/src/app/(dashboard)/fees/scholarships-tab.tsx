"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Award, Trash2, Pencil, UserPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { usePermission } from "@/hooks/use-permission";
import { toast } from "@/components/ui/toaster";
import type { ScholarshipItem } from "@/types";
import { ScholarshipFormDialog } from "./scholarship-form-dialog";
import { AssignScholarshipDialog } from "./assign-scholarship-dialog";

export function ScholarshipsTab() {
  const canCreate = usePermission("scholarships.create");
  const canDelete = usePermission("scholarships.delete");
  const canAssign = usePermission("scholarships.edit");

  const [scholarships, setScholarships] = useState<ScholarshipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ScholarshipItem | null>(null);
  const [assignTarget, setAssignTarget] = useState<ScholarshipItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScholarshipItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchScholarships = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/scholarships");
      const json = await res.json();
      setScholarships(res.ok ? json.data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchScholarships(); }, [fetchScholarships]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/scholarships/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Failed to delete scholarship", description: json.message, variant: "destructive" }); return; }
      toast({ title: "Scholarship deleted", variant: "success" });
      setDeleteTarget(null);
      fetchScholarships();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        {canCreate && (
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Scholarship
          </Button>
        )}
      </div>

      {loading ? (
        <Card className="p-4"><TableSkeleton rows={4} cols={3} /></Card>
      ) : scholarships.length === 0 ? (
        <Card><EmptyState title="No scholarships yet" description="Create a scholarship or discount plan to get started." /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {scholarships.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                      <Award className="h-4.5 w-4.5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.studentCount ?? 0} student(s)</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {canCreate && (
                      <button onClick={() => { setEditing(s); setFormOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => setDeleteTarget(s)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{s.description || "No description"}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{s.type === "PERCENTAGE" ? `${s.value}% off` : `Rs. ${s.value.toLocaleString()} off`}</Badge>
                  {canAssign && (
                    <Button variant="outline" size="sm" onClick={() => setAssignTarget(s)}>
                      <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Assign
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ScholarshipFormDialog open={formOpen} onOpenChange={setFormOpen} scholarship={editing} onSaved={fetchScholarships} />
      <AssignScholarshipDialog open={!!assignTarget} onOpenChange={(o) => !o && setAssignTarget(null)} scholarship={assignTarget} onSaved={fetchScholarships} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete scholarship?"
        description={`This will remove "${deleteTarget?.name}" and its student assignments.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
