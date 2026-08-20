"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { usePermission } from "@/hooks/use-permission";
import { toast } from "@/components/ui/toaster";
import { formatDate } from "@/lib/utils";
import type { ClassItem } from "@/types";

type Status = "PRESENT" | "ABSENT" | "LEAVE" | "LATE";
const statusVariant: Record<Status, "success" | "destructive" | "warning" | "secondary"> = {
  PRESENT: "success", ABSENT: "destructive", LATE: "warning", LEAVE: "secondary",
};

interface HistoryRow {
  id: string;
  studentName: string;
  registrationNumber: string;
  subjectName: string | null;
  date: string;
  status: Status;
  remarks: string | null;
  markedByName: string | null;
}

export function AttendanceHistoryTab() {
  const canEdit = usePermission("attendance.edit");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classId, setClassId] = useState("ALL");
  const [sectionId, setSectionId] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => { fetch("/api/classes").then((r) => r.json()).then((j) => setClasses(j.data ?? [])); }, []);
  const sections = classes.find((c) => c.id === classId)?.sections ?? [];

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (classId !== "ALL") params.set("classId", classId);
      if (sectionId !== "ALL") params.set("sectionId", sectionId);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`/api/attendance?${params}`);
      const json = await res.json();
      setRows(res.ok ? json.data : []);
      setTotalPages(json.pagination?.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  }, [classId, sectionId, startDate, endDate, page]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  async function handleStatusChange(id: string, status: Status) {
    const res = await fetch(`/api/attendance/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const json = await res.json();
      toast({ title: "Failed to update", description: json.message, variant: "destructive" });
      return;
    }
    toast({ title: "Attendance updated", variant: "success" });
    fetchHistory();
  }

  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
        <div className="space-y-1.5">
          <Label>Class</Label>
          <Select value={classId} onValueChange={(v) => { setClassId(v); setSectionId("ALL"); setPage(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Classes</SelectItem>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Section</Label>
          <Select value={sectionId} onValueChange={(v) => { setSectionId(v); setPage(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Sections</SelectItem>
              {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>From</Label>
          <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} />
        </div>
        <div className="space-y-1.5">
          <Label>To</Label>
          <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} />
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : rows.length === 0 ? (
        <EmptyState title="No attendance records found" description="Adjust your filters or mark attendance first." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Marked By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <p className="font-medium">{r.studentName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{r.registrationNumber}</p>
                  </TableCell>
                  <TableCell>{r.subjectName ?? <span className="text-muted-foreground">Whole day</span>}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(r.date)}</TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Select value={r.status} onValueChange={(v) => handleStatusChange(r.id, v as Status)}>
                        <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(["PRESENT", "ABSENT", "LATE", "LEAVE"] as Status[]).map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={statusVariant[r.status]}>{r.status}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.markedByName ?? "—"}</TableCell>
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
  );
}
