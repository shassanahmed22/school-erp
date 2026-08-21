"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Trophy, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { usePermission } from "@/hooks/use-permission";
import { toast } from "@/components/ui/toaster";
import type { ClassItem } from "@/types";

interface ResultRow {
  id: string;
  studentName: string;
  registrationNumber: string;
  examId: string;
  examName: string;
  className: string;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  grade: string;
  position: number | null;
  status: "DRAFT" | "PUBLISHED";
}

interface ExamOption { id: string; name: string; status: string; className: string }

function ResultsPageInner() {
  const searchParams = useSearchParams();
  const canEdit = usePermission("results.edit");

  const [exams, setExams] = useState<ExamOption[]>([]);
  const [examId, setExamId] = useState(searchParams.get("examId") ?? "");
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    fetch("/api/exams?limit=100").then((r) => r.json()).then((j) => {
      const list = (j.data ?? []).map((e: any) => ({ id: e.id, name: e.name, status: e.status, className: e.className }));
      setExams(list);
      if (!examId && list.length > 0) setExamId(list[0].id);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchResults = useCallback(async () => {
    if (!examId) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/results?examId=${examId}&page=${page}&limit=50`);
      const json = await res.json();
      setRows(res.ok ? json.data : []);
      setTotalPages(json.pagination?.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  }, [examId, page]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const currentExam = exams.find((e) => e.id === examId);
  const isPublished = currentExam?.status === "RESULT_PUBLISHED";

  async function handlePublishToggle() {
    if (!examId) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/results/${examId}/${isPublished ? "unpublish" : "publish"}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Action failed", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: isPublished ? "Results unpublished" : "Results published", variant: "success" });
      const examsRes = await fetch("/api/exams?limit=100");
      const examsJson = await examsRes.json();
      setExams((examsJson.data ?? []).map((e: any) => ({ id: e.id, name: e.name, status: e.status, className: e.className })));
      fetchResults();
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Result Management"
        description="Review computed results, rankings, and publish result cards to students."
        actions={
          canEdit && examId && (
            <Button onClick={handlePublishToggle} disabled={publishing} variant={isPublished ? "outline" : "default"}>
              {isPublished ? <XCircle className="mr-1.5 h-4 w-4" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
              {publishing ? "Please wait..." : isPublished ? "Unpublish Results" : "Publish Results"}
            </Button>
          )
        }
      />

      <div className="mb-4 max-w-sm">
        <Select value={examId} onValueChange={(v) => { setExamId(v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="Select an exam" /></SelectTrigger>
          <SelectContent>
            {exams.map((e) => <SelectItem key={e.id} value={e.id}>{e.name} ({e.className})</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="p-4">
        {!examId ? (
          <EmptyState title="Select an exam" description="Choose an exam above to view its results." />
        ) : loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : rows.length === 0 ? (
          <EmptyState title="No results computed yet" description="Enter marks for this exam's subjects first." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      {r.position === 1 ? (
                        <span className="flex items-center gap-1 font-semibold text-amber-600"><Trophy className="h-4 w-4" /> 1st</span>
                      ) : (
                        r.position ?? "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{r.studentName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{r.registrationNumber}</p>
                    </TableCell>
                    <TableCell>{r.obtainedMarks} / {r.totalMarks}</TableCell>
                    <TableCell>{r.percentage}%</TableCell>
                    <TableCell><Badge variant="secondary">{r.grade}</Badge></TableCell>
                    <TableCell><Badge variant={r.status === "PUBLISHED" ? "success" : "warning"}>{r.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild><Link href={`/results/${r.id}/print`}>View Card</Link></Button>
                    </TableCell>
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
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={6} cols={6} />}>
      <ResultsPageInner />
    </Suspense>
  );
}
