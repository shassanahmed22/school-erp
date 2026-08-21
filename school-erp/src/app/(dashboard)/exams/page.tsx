"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, ChevronLeft, ChevronRight, ClipboardList, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { usePermission } from "@/hooks/use-permission";
import { toast } from "@/components/ui/toaster";
import { formatDate } from "@/lib/utils";
import { ExamFormDialog } from "./exam-form-dialog";

interface ExamListItem {
  id: string;
  name: string;
  type: string;
  status: string;
  className: string;
  academicYearName: string;
  startDate: string;
  endDate: string;
  subjectCount: number;
  resultCount: number;
}

const statusVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  DRAFT: "secondary", SCHEDULED: "warning", ONGOING: "warning",
  COMPLETED: "secondary", RESULT_PUBLISHED: "success", CANCELLED: "destructive",
};

export default function ExamsPage() {
  const canCreate = usePermission("exams.create");
  const canDelete = usePermission("exams.delete");

  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExamListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (status !== "ALL") params.set("status", status);
      const res = await fetch(`/api/exams?${params}`);
      const json = await res.json();
      setExams(res.ok ? json.data : []);
      setTotalPages(json.pagination?.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/exams/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        toast({ title: "Failed to delete exam", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: "Exam deleted", variant: "success" });
      setDeleteTarget(null);
      fetchExams();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Examination Management"
        description="Create exams, assign subjects, and manage schedules."
        actions={canCreate && <Button onClick={() => setFormOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> Create Exam</Button>}
      />

      <Card className="p-4">
        <div className="max-w-xs mb-4">
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {["DRAFT", "SCHEDULED", "ONGOING", "COMPLETED", "RESULT_PUBLISHED", "CANCELLED"].map((s) => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : exams.length === 0 ? (
          <EmptyState title="No exams found" description="Create your first exam to get started." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Subjects</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Link href={`/exams/${e.id}`} className="flex items-center gap-2 hover:underline font-medium">
                        <ClipboardList className="h-4 w-4 text-muted-foreground" /> {e.name}
                      </Link>
                      <p className="text-xs text-muted-foreground ml-6">{e.type.replace(/_/g, " ")}</p>
                    </TableCell>
                    <TableCell>{e.className}</TableCell>
                    <TableCell><Badge variant="secondary">{e.subjectCount} subjects</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(e.startDate)} – {formatDate(e.endDate)}</TableCell>
                    <TableCell><Badge variant={statusVariant[e.status]}>{e.status.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild><Link href={`/exams/${e.id}`}>Manage</Link></Button>
                      {canDelete && (
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(e)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
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

      <ExamFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={fetchExams} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete exam?"
        description={`This will remove "${deleteTarget?.name}" and its subject/schedule assignments.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
