"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, ClipboardCheck, Pencil, Trash2, Users2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { usePermission } from "@/hooks/use-permission";
import { toast } from "@/components/ui/toaster";
import { AssignmentFormDialog } from "./assignment-form-dialog";
import { SubmissionsPanelDialog } from "./submissions-panel-dialog";
import type { AssignmentItem, ClassItem, SubjectItem } from "@/types";

const statusVariant: Record<string, "success" | "secondary" | "default"> = {
  DRAFT: "secondary",
  PUBLISHED: "default",
  CLOSED: "secondary",
};

export function TeacherAssignmentsView() {
  const canCreate = usePermission("assignments.create");
  const canEdit = usePermission("assignments.edit");
  const canDelete = usePermission("assignments.delete");

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AssignmentItem | null>(null);
  const [submissionsTarget, setSubmissionsTarget] = useState<AssignmentItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssignmentItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/classes").then((r) => r.json()),
      fetch("/api/subjects").then((r) => r.json()),
    ]).then(([classesJson, subjectsJson]) => {
      setClasses(classesJson.data ?? []);
      setSubjects(subjectsJson.data ?? []);
    });
  }, []);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  const fetchAssignments = useCallback(async () => {
    if (!selectedSectionId) { setAssignments([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/assignments?sectionId=${selectedSectionId}`);
      const json = await res.json();
      setAssignments(res.ok ? json.data : []);
    } finally {
      setLoading(false);
    }
  }, [selectedSectionId]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/assignments/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Failed to delete assignment", description: json.message, variant: "destructive" }); return; }
      toast({ title: "Assignment deleted", variant: "success" });
      setDeleteTarget(null);
      fetchAssignments();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-3">
          <Select value={selectedClassId} onValueChange={(v) => { setSelectedClassId(v); setSelectedSectionId(""); }}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Select Class" /></SelectTrigger>
            <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={selectedSectionId} onValueChange={setSelectedSectionId} disabled={!selectedClass}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Select Section" /></SelectTrigger>
            <SelectContent>
              {selectedClass?.sections.map((s) => <SelectItem key={s.id} value={s.id}>Section {s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {canCreate && (
          <Button disabled={!selectedSectionId} onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" /> Post Assignment
          </Button>
        )}
      </div>

      {!selectedSectionId ? (
        <Card><EmptyState title="Select a class and section" description="Choose a class and section above to view and manage its assignments." /></Card>
      ) : loading ? (
        <Card className="p-4"><TableSkeleton rows={4} cols={1} /></Card>
      ) : assignments.length === 0 ? (
        <Card><EmptyState title="No assignments posted yet" icon={<ClipboardCheck className="h-6 w-6 text-muted-foreground" />} /></Card>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-semibold">{a.title}</p>
                      <Badge variant="secondary">{a.subjectName}</Badge>
                      <Badge variant={statusVariant[a.status] ?? "secondary"}>{a.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-2">{a.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Due {new Date(a.dueDate).toLocaleDateString()}
                      {a.maxMarks && ` · ${a.maxMarks} marks`}
                      {a.teacherName && ` · By ${a.teacherName}`}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" title="View submissions" onClick={() => setSubmissionsTarget(a)}>
                      <Users2 className="h-4 w-4" />
                    </Button>
                    {canEdit && (
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(a); setFormOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(a)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-2">
                  <Badge variant="secondary">{a.submissionCount ?? 0} submitted</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AssignmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        sectionId={selectedSectionId}
        subjects={subjects}
        editingAssignment={editing}
        onSaved={fetchAssignments}
      />

      <SubmissionsPanelDialog
        open={!!submissionsTarget}
        onOpenChange={(o) => !o && setSubmissionsTarget(null)}
        assignment={submissionsTarget}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete assignment?"
        description="This will remove the assignment and hide it from students. Existing submissions are kept for records."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
