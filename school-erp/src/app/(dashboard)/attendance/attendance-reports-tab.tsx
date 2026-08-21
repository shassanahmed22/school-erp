"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import type { ClassItem } from "@/types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface ReportRow {
  studentId: string;
  studentName: string;
  registrationNumber: string;
  rollNumber: string | null;
  totalDays: number;
  present: number;
  absent: number;
  leave: number;
  late: number;
  percentage: number;
}

export function AttendanceReportsTab() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [minPercentage, setMinPercentage] = useState(75);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/classes").then((r) => r.json()).then((j) => setClasses(j.data ?? []));
    fetch("/api/attendance-rules").then((r) => r.json()).then((j) => {
      if (j.data?.minimumAttendancePercentage) setMinPercentage(Number(j.data.minimumAttendancePercentage));
    });
  }, []);

  const sections = classes.find((c) => c.id === classId)?.sections ?? [];

  const fetchReport = useCallback(async () => {
    if (!sectionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/report?sectionId=${sectionId}&month=${month}&year=${year}`);
      const json = await res.json();
      setRows(res.ok ? json.data.students : []);
    } finally {
      setLoading(false);
    }
  }, [sectionId, month, year]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

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
          <Label>Month</Label>
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Year</Label>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!sectionId ? (
        <EmptyState title="Select a class and section" description="Choose a section above to generate its monthly attendance report." />
      ) : loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : rows.length === 0 ? (
        <EmptyState title="No attendance data" description="No records found for the selected month." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Roll #</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Present</TableHead>
              <TableHead>Absent</TableHead>
              <TableHead>Leave</TableHead>
              <TableHead>Late</TableHead>
              <TableHead>Percentage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.studentId}>
                <TableCell>{r.rollNumber ?? "—"}</TableCell>
                <TableCell>
                  <p className="font-medium">{r.studentName}</p>
                  <p className="text-xs text-muted-foreground font-mono">{r.registrationNumber}</p>
                </TableCell>
                <TableCell>{r.present}</TableCell>
                <TableCell>{r.absent}</TableCell>
                <TableCell>{r.leave}</TableCell>
                <TableCell>{r.late}</TableCell>
                <TableCell>
                  <Badge variant={r.percentage >= minPercentage ? "success" : "destructive"}>{r.percentage}%</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
