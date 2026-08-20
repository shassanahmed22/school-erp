"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { usePermission } from "@/hooks/use-permission";
import { toast } from "@/components/ui/toaster";
import { TimetableGrid } from "./timetable-grid";
import { PeriodFormDialog } from "./period-form-dialog";
import type { ClassItem, SubjectItem, TeacherListItem, TimetablePeriodItem } from "@/types";

export function SectionTimetableEditor() {
  const canEdit = usePermission("timetable.create");
  const canDelete = usePermission("timetable.delete");

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherListItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [periods, setPeriods] = useState<TimetablePeriodItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [formDay, setFormDay] = useState("MONDAY");
  const [formPeriodNumber, setFormPeriodNumber] = useState(1);
  const [editingPeriod, setEditingPeriod] = useState<TimetablePeriodItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TimetablePeriodItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/classes").then((r) => r.json()),
      fetch("/api/subjects").then((r) => r.json()),
      fetch("/api/teachers?limit=100").then((r) => r.json()),
    ]).then(([classesJson, subjectsJson, teachersJson]) => {
      setClasses(classesJson.data ?? []);
      setSubjects(subjectsJson.data ?? []);
      setTeachers(teachersJson.data ?? []);
    });
  }, []);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  const fetchPeriods = useCallback(async () => {
    if (!selectedSectionId) { setPeriods([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/timetable?sectionId=${selectedSectionId}`);
      const json = await res.json();
      setPeriods(res.ok ? json.data : []);
    } finally {
      setLoading(false);
    }
  }, [selectedSectionId]);

  useEffect(() => { fetchPeriods(); }, [fetchPeriods]);

  function handleAddPeriod(day: string, periodNumber: number) {
    setEditingPeriod(null);
    setFormDay(day);
    setFormPeriodNumber(periodNumber);
    setFormOpen(true);
  }

  function handleEditPeriod(period: TimetablePeriodItem) {
    setEditingPeriod(period);
    setFormDay(period.dayOfWeek);
    setFormPeriodNumber(period.periodNumber);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/timetable/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Failed to remove period", description: json.message, variant: "destructive" }); return; }
      toast({ title: "Period removed", variant: "success" });
      setDeleteTarget(null);
      fetchPeriods();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={selectedClassId} onValueChange={(v) => { setSelectedClassId(v); setSelectedSectionId(""); }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Select Class" /></SelectTrigger>
          <SelectContent>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedSectionId} onValueChange={setSelectedSectionId} disabled={!selectedClass}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Select Section" /></SelectTrigger>
          <SelectContent>
            {selectedClass?.sections.map((s) => <SelectItem key={s.id} value={s.id}>Section {s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!selectedSectionId ? (
        <Card><EmptyState title="Select a class and section" description="Choose a class and section above to view or edit its weekly timetable." /></Card>
      ) : loading ? (
        <Skeleton className="h-96 rounded-lg" />
      ) : (
        <Card className="p-4">
          <TimetableGrid
            periods={periods}
            editable={canEdit}
            onAddPeriod={handleAddPeriod}
            onEditPeriod={handleEditPeriod}
            onDeletePeriod={canDelete ? setDeleteTarget : undefined}
          />
        </Card>
      )}

      <PeriodFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        sectionId={selectedSectionId}
        day={formDay}
        periodNumber={formPeriodNumber}
        subjects={subjects}
        teachers={teachers}
        editingPeriod={editingPeriod}
        onSaved={fetchPeriods}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Remove this period?"
        description="This will remove the period from the section's weekly timetable."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
