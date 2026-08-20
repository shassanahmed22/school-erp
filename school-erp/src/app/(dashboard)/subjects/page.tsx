"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, BookOpen, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { usePermission } from "@/hooks/use-permission";
import { toast } from "@/components/ui/toaster";
import type { SubjectItem } from "@/types";
import { SubjectFormDialog } from "./subject-form-dialog";
import { AssignClassDialog } from "./assign-class-dialog";

export default function SubjectsPage() {
  const canCreate = usePermission("subjects.create");
  const canEdit = usePermission("subjects.edit");
  const canDelete = usePermission("subjects.delete");

  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<SubjectItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SubjectItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/subjects");
      const json = await res.json();
      setSubjects(res.ok ? json.data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/subjects/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        toast({ title: "Failed to delete subject", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: "Subject deleted", variant: "success" });
      setDeleteTarget(null);
      fetchSubjects();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Subject Management"
        description="Create subjects and assign them to classes."
        actions={canCreate && <Button onClick={() => setFormOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> Add Subject</Button>}
      />

      <Card className="p-4">
        {loading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : subjects.length === 0 ? (
          <EmptyState title="No subjects yet" description="Add your first subject to get started." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Assigned Classes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium">{s.name}</p>
                        {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{s.code}</TableCell>
                  <TableCell><Badge variant="secondary">{s.classCount ?? 0} classes</Badge></TableCell>
                  <TableCell className="text-right">
                    {canEdit && (
                      <Button variant="outline" size="sm" onClick={() => setAssignTarget(s)}>Assign to Class</Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(s)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <SubjectFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={fetchSubjects} />
      <AssignClassDialog
        open={!!assignTarget}
        onOpenChange={(open) => !open && setAssignTarget(null)}
        subject={assignTarget}
        onSaved={fetchSubjects}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete subject?"
        description={`This will remove "${deleteTarget?.name}" and its class assignments.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
