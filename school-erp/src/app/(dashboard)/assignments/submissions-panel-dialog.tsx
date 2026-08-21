"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { usePermission } from "@/hooks/use-permission";
import { toast } from "@/components/ui/toaster";
import type { AssignmentItem, AssignmentSubmissionRow } from "@/types";

const statusVariant: Record<string, "success" | "secondary" | "destructive" | "default"> = {
  PENDING: "secondary",
  SUBMITTED: "default",
  LATE: "destructive",
  GRADED: "success",
};

export function SubmissionsPanelDialog({
  open, onOpenChange, assignment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: AssignmentItem | null;
}) {
  const canGrade = usePermission("assignments.grade");
  const [rows, setRows] = useState<AssignmentSubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [marks, setMarks] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchSubmissions = useCallback(async () => {
    if (!assignment) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/assignments/${assignment.id}/submissions`);
      const json = await res.json();
      setRows(res.ok ? json.data : []);
    } finally {
      setLoading(false);
    }
  }, [assignment]);

  useEffect(() => { if (open) fetchSubmissions(); }, [open, fetchSubmissions]);

  function startGrading(row: AssignmentSubmissionRow) {
    setGradingId(row.submissionId);
    setMarks(row.marksObtained?.toString() ?? "");
    setFeedback(row.feedback ?? "");
  }

  async function handleGrade(row: AssignmentSubmissionRow) {
    if (!assignment || !row.submissionId) return;
    if (marks === "") { toast({ title: "Please enter marks", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/assignments/${assignment.id}/submissions/${row.submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marksObtained: Number(marks), feedback: feedback || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Failed to save grade", description: json.message, variant: "destructive" }); return; }
      toast({ title: "Grade saved", variant: "success" });
      setGradingId(null);
      fetchSubmissions();
    } finally {
      setSaving(false);
    }
  }

  if (!assignment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-3xl">
        <DialogHeader>
          <DialogTitle>Submissions — {assignment.title}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Marks</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.studentId}>
                  <TableCell>
                    <p className="font-medium">{row.studentName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{row.registrationNumber}</p>
                  </TableCell>
                  <TableCell><Badge variant={statusVariant[row.status] ?? "secondary"}>{row.status}</Badge></TableCell>
                  <TableCell>
                    {row.marksObtained !== null ? `${row.marksObtained}${assignment.maxMarks ? ` / ${assignment.maxMarks}` : ""}` : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.submissionId && canGrade && (
                      <Button variant="outline" size="sm" onClick={() => startGrading(row)}>
                        {row.status === "GRADED" ? "Regrade" : "Grade"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {gradingId && (
          <div className="mt-4 rounded-md border p-4 space-y-3">
            <p className="text-sm font-medium">Grade Submission</p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                min={0}
                max={assignment.maxMarks ?? undefined}
                placeholder={assignment.maxMarks ? `Marks (out of ${assignment.maxMarks})` : "Marks"}
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
              />
            </div>
            <Textarea placeholder="Feedback (optional)" rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setGradingId(null)}>Cancel</Button>
              <Button
                size="sm"
                disabled={saving}
                onClick={() => handleGrade(rows.find((r) => r.submissionId === gradingId)!)}
              >
                {saving ? "Saving..." : "Save Grade"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
