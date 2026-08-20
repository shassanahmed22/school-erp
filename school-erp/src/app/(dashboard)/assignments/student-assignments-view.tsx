"use client";

import { useEffect, useState, useCallback } from "react";
import { ClipboardCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { StudentAssignmentDialog } from "./student-assignment-dialog";
import type { AssignmentItem } from "@/types";

const statusVariant: Record<string, "success" | "secondary" | "destructive" | "default"> = {
  GRADED: "success",
  SUBMITTED: "default",
  LATE: "destructive",
};

export function StudentAssignmentsView() {
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AssignmentItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/assignments");
      const json = await res.json();
      setAssignments(res.ok ? json.data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  if (loading) return <Card className="p-4"><TableSkeleton rows={4} cols={1} /></Card>;

  if (assignments.length === 0) {
    return <Card><EmptyState title="No assignments yet" description="Your teacher hasn't posted any assignments for your class." icon={<ClipboardCheck className="h-6 w-6 text-muted-foreground" />} /></Card>;
  }

  return (
    <div className="space-y-3">
      {assignments.map((a) => {
        const status = a.mySubmission?.status ?? "PENDING";
        const isOverdue = !a.mySubmission && new Date() > new Date(a.dueDate);
        return (
          <Card key={a.id} className="cursor-pointer hover:bg-muted/40" onClick={() => { setSelected(a); setDetailOpen(true); }}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-semibold">{a.title}</p>
                    <Badge variant="secondary">{a.subjectName}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{a.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Due {new Date(a.dueDate).toLocaleDateString()}{a.maxMarks && ` · ${a.maxMarks} marks`}
                  </p>
                </div>
                {a.mySubmission ? (
                  <Badge variant={statusVariant[status] ?? "secondary"}>
                    {status === "GRADED" ? `Graded: ${a.mySubmission.marksObtained}${a.maxMarks ? `/${a.maxMarks}` : ""}` : status}
                  </Badge>
                ) : (
                  <Badge variant={isOverdue ? "destructive" : "secondary"}>{isOverdue ? "Overdue" : "Not submitted"}</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <StudentAssignmentDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        assignment={selected}
        onSubmitted={fetchAssignments}
      />
    </div>
  );
}
