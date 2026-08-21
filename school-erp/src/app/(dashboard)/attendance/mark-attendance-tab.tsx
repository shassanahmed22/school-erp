"use client";

import { useEffect, useState, useCallback } from "react";
import { Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import type { ClassItem, SubjectItem } from "@/types";

type Status = "PRESENT" | "ABSENT" | "LEAVE" | "LATE";
const STATUS_OPTIONS: { value: Status; label: string; color: string }[] = [
  { value: "PRESENT", label: "Present", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" },
  { value: "ABSENT", label: "Absent", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
  { value: "LATE", label: "Late", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
  { value: "LEAVE", label: "Leave", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
];

interface RosterEntry {
  studentId: string;
  firstName: string;
  lastName: string;
  registrationNumber: string;
  rollNumber: string | null;
  status: Status;
  remarks: string;
  alreadyMarked: boolean;
}

export function MarkAttendanceTab() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState<string>("WHOLE_DAY");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/classes").then((r) => r.json()).then((j) => setClasses(j.data ?? []));
    fetch("/api/subjects").then((r) => r.json()).then((j) => setSubjects(j.data ?? []));
  }, []);

  const sections = classes.find((c) => c.id === classId)?.sections ?? [];

  const fetchRoster = useCallback(async () => {
    if (!sectionId || !date) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ sectionId, date });
      if (subjectId !== "WHOLE_DAY") params.set("subjectId", subjectId);
      const res = await fetch(`/api/attendance/roster?${params}`);
      const json = await res.json();
      setRoster(res.ok ? json.data.roster : []);
    } finally {
      setLoading(false);
    }
  }, [sectionId, date, subjectId]);

  useEffect(() => { fetchRoster(); }, [fetchRoster]);

  function updateStatus(studentId: string, status: Status) {
    setRoster((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, status } : r)));
  }

  function markAll(status: Status) {
    setRoster((prev) => prev.map((r) => ({ ...r, status })));
  }

  async function handleSave() {
    if (!classId || !sectionId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          sectionId,
          date,
          ...(subjectId !== "WHOLE_DAY" && { subjectId }),
          entries: roster.map((r) => ({ studentId: r.studentId, status: r.status, remarks: r.remarks || undefined })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Failed to save attendance", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: `Attendance saved for ${json.data.marked} student(s)`, variant: "success" });
      fetchRoster();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
        <div className="space-y-1.5">
          <Label>Class</Label>
          <Select value={classId} onValueChange={(v) => { setClassId(v); setSectionId(""); }}>
            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Section</Label>
          <Select value={sectionId} onValueChange={setSectionId}>
            <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
            <SelectContent>{sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Subject (optional)</Label>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="WHOLE_DAY">Whole Day</SelectItem>
              {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {!sectionId ? (
        <EmptyState title="Select a class and section" description="Choose a class and section above to load the student roster." />
      ) : loading ? (
        <TableSkeleton rows={6} cols={4} />
      ) : roster.length === 0 ? (
        <EmptyState title="No students enrolled" description="This section has no active enrollments yet." />
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <Button key={opt.value} variant="outline" size="sm" onClick={() => markAll(opt.value)}>
                  Mark all {opt.label}
                </Button>
              ))}
            </div>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-1.5 h-4 w-4" /> {saving ? "Saving..." : "Save Attendance"}
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Roll #</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.map((r) => (
                <TableRow key={r.studentId}>
                  <TableCell>{r.rollNumber ?? "—"}</TableCell>
                  <TableCell>
                    <p className="font-medium">{r.firstName} {r.lastName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{r.registrationNumber}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      {STATUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => updateStatus(r.studentId, opt.value)}
                          className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                            r.status === opt.value ? opt.color + " border-transparent" : "border-input text-muted-foreground hover:bg-accent"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8"
                      value={r.remarks}
                      placeholder="Optional remarks..."
                      onChange={(e) => setRoster((prev) => prev.map((x) => (x.studentId === r.studentId ? { ...x, remarks: e.target.value } : x)))}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </Card>
  );
}
