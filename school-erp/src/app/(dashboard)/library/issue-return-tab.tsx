"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { usePermission } from "@/hooks/use-permission";
import { toast } from "@/components/ui/toaster";
import type { BookIssueItem } from "@/types";
import { formatDate } from "@/lib/utils";
import { IssueBookDialog } from "./issue-book-dialog";

const statusVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  ISSUED: "secondary", RETURNED: "success", OVERDUE: "destructive", LOST: "destructive",
};

export function IssueReturnTab() {
  const canIssue = usePermission("books.create");
  const canReturn = usePermission("books.edit");

  const [rows, setRows] = useState<BookIssueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [issueOpen, setIssueOpen] = useState(false);
  const [returning, setReturning] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (search) params.set("search", search);
      if (status !== "ALL") params.set("status", status);
      const res = await fetch(`/api/book-issues?${params}`);
      const json = await res.json();
      setRows(res.ok ? json.data : []);
      setTotalPages(json.pagination?.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => {
    const t = setTimeout(fetchRows, 300);
    return () => clearTimeout(t);
  }, [fetchRows]);

  async function handleReturn(id: string) {
    setReturning(id);
    try {
      const res = await fetch(`/api/book-issues/${id}/return`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Failed to return book", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: json.message, variant: "success" });
      fetchRows();
    } finally {
      setReturning(null);
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search student or book..." className="pl-9" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {["ISSUED", "RETURNED", "OVERDUE", "LOST"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {canIssue && <Button onClick={() => setIssueOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> Issue Book</Button>}
      </div>

      <Card className="p-4">
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : rows.length === 0 ? (
          <EmptyState title="No book issues found" description="Issue a book to a student to get started." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fine</TableHead>
                  {canReturn && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.bookTitle}</TableCell>
                    <TableCell>
                      <p>{r.studentName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{r.registrationNumber}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(r.issueDate)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(r.dueDate)}</TableCell>
                    <TableCell><Badge variant={statusVariant[r.status]}>{r.status}</Badge></TableCell>
                    <TableCell>{r.fineAmount > 0 ? `Rs. ${r.fineAmount.toLocaleString()}` : "—"}</TableCell>
                    {canReturn && (
                      <TableCell className="text-right">
                        {(r.status === "ISSUED" || r.status === "OVERDUE") && (
                          <Button size="sm" onClick={() => handleReturn(r.id)} disabled={returning === r.id}>
                            {returning === r.id ? "..." : "Return"}
                          </Button>
                        )}
                      </TableCell>
                    )}
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

      <IssueBookDialog open={issueOpen} onOpenChange={setIssueOpen} onSaved={fetchRows} />
    </div>
  );
}
