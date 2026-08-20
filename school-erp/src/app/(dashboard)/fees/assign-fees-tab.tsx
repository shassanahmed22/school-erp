"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { ExportButtons } from "@/components/shared/export-buttons";
import { usePermission } from "@/hooks/use-permission";
import type { StudentFeeItem } from "@/types";
import { formatDate } from "@/lib/utils";
import { BulkAssignDialog } from "./bulk-assign-dialog";
import { IndividualAssignDialog } from "./individual-assign-dialog";
import { StudentFeeDetailDialog } from "./student-fee-detail-dialog";

const statusVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  PENDING: "warning", PARTIALLY_PAID: "secondary", PAID: "success", OVERDUE: "destructive", WAIVED: "secondary",
};

export function AssignFeesTab() {
  const canAssign = usePermission("student-fees.create");

  const [rows, setRows] = useState<StudentFeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [individualOpen, setIndividualOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (search) params.set("search", search);
      if (status !== "ALL") params.set("status", status);
      const res = await fetch(`/api/student-fees?${params}`);
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

  const exportRows = rows.map((r) => [
    r.registrationNumber, r.studentName, r.feeCategoryName, r.className,
    r.amount, r.discount, r.finalAmount, r.paidAmount, formatDate(r.dueDate), r.status,
  ]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <Input placeholder="Search student..." className="max-w-xs" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {["PENDING", "PARTIALLY_PAID", "PAID", "OVERDUE", "WAIVED"].map((s) => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <ExportButtons
            filename="student-fees"
            headers={["Reg #", "Student", "Category", "Class", "Amount", "Discount", "Final Amount", "Paid", "Due Date", "Status"]}
            rows={exportRows}
          />
          {canAssign && (
            <>
              <Button variant="outline" onClick={() => setIndividualOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> Assign to Student
              </Button>
              <Button onClick={() => setBulkOpen(true)}>
                <Users className="mr-1.5 h-4 w-4" /> Bulk Assign
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="p-4">
        {loading ? (
          <TableSkeleton rows={6} cols={7} />
        ) : rows.length === 0 ? (
          <EmptyState title="No fee assignments found" description="Assign a fee structure to students to get started." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <p className="font-medium">{r.studentName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{r.registrationNumber}</p>
                    </TableCell>
                    <TableCell>{r.feeCategoryName}</TableCell>
                    <TableCell>Rs. {r.finalAmount.toLocaleString()}</TableCell>
                    <TableCell>{r.discount > 0 ? `Rs. ${r.discount.toLocaleString()}` : "—"}</TableCell>
                    <TableCell>Rs. {r.paidAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(r.dueDate)}</TableCell>
                    <TableCell><Badge variant={statusVariant[r.status]}>{r.status.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setDetailId(r.id)}>Details</Button>
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

      <BulkAssignDialog open={bulkOpen} onOpenChange={setBulkOpen} onSaved={fetchRows} />
      <IndividualAssignDialog open={individualOpen} onOpenChange={setIndividualOpen} onSaved={fetchRows} />
      <StudentFeeDetailDialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)} studentFeeId={detailId} />
    </div>
  );
}
