"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Play, ChevronLeft, ChevronRight, Banknote, Clock, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { StatCard } from "@/components/shared/stat-card";
import { ExportButtons } from "@/components/shared/export-buttons";
import { usePermission } from "@/hooks/use-permission";
import { toast } from "@/components/ui/toaster";
import type { PayrollItem } from "@/types";
import { GeneratePayrollDialog } from "./generate-payroll-dialog";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const statusVariant: Record<string, "success" | "warning" | "destructive"> = {
  PAID: "success", PENDING: "warning", FAILED: "destructive",
};

export function PayrollTab() {
  const canGenerate = usePermission("payroll.create");
  const canEdit = usePermission("payroll.edit");

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [status, setStatus] = useState("ALL");
  const [rows, setRows] = useState<PayrollItem[]>([]);
  const [summary, setSummary] = useState<{ monthlyPayrollCost: number; pendingCount: number; pendingAmount: number; paidCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15", month: String(month), year: String(year) });
      if (status !== "ALL") params.set("paymentStatus", status);
      const [rowsRes, summaryRes] = await Promise.all([
        fetch(`/api/payroll?${params}`).then((r) => r.json()),
        fetch(`/api/payroll/summary?month=${month}&year=${year}`).then((r) => r.json()),
      ]);
      setRows(rowsRes.data ?? []);
      setTotalPages(rowsRes.pagination?.totalPages ?? 1);
      setSummary(summaryRes.data);
    } finally {
      setLoading(false);
    }
  }, [month, year, status, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleMarkPaid(id: string) {
    setMarkingPaid(id);
    try {
      const res = await fetch(`/api/payroll/${id}/mark-paid`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Failed to mark paid", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: "Marked as paid", variant: "success" });
      fetchData();
    } finally {
      setMarkingPaid(null);
    }
  }

  const exportRows = rows.map((r) => [
    r.employeeCode, r.employeeName, r.departmentName, `${r.month}/${r.year}`,
    r.basicSalary, r.allowances, r.bonus, r.deductions, r.grossSalary, r.netSalary, r.paymentStatus,
  ]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-3">
          <Select value={String(month)} onValueChange={(v) => { setMonth(Number(v)); setPage(1); }}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => { setYear(Number(v)); setPage(1); }}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <ExportButtons
            filename={`payroll-${month}-${year}`}
            headers={["Code", "Name", "Department", "Period", "Basic", "Allowances", "Bonus", "Deductions", "Gross", "Net", "Status"]}
            rows={exportRows}
          />
          {canGenerate && (
            <Button onClick={() => setGenerateOpen(true)}>
              <Play className="mr-1.5 h-4 w-4" /> Generate Payroll
            </Button>
          )}
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <StatCard label="Monthly Payroll Cost" value={`Rs. ${summary.monthlyPayrollCost.toLocaleString()}`} icon={<Banknote className="h-5 w-5 text-white" />} colorClass="bg-blue-600" />
          <StatCard label="Pending Salaries" value={`${summary.pendingCount} (Rs. ${summary.pendingAmount.toLocaleString()})`} icon={<Clock className="h-5 w-5 text-white" />} colorClass="bg-amber-500" />
          <StatCard label="Paid This Month" value={summary.paidCount} icon={<Wallet className="h-5 w-5 text-white" />} colorClass="bg-green-600" />
        </div>
      )}

      <Card className="p-4">
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : rows.length === 0 ? (
          <EmptyState title="No payroll generated for this period" description="Click 'Generate Payroll' to create salary records for all active employees." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <p className="font-medium">{r.employeeName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{r.employeeCode}</p>
                    </TableCell>
                    <TableCell>{r.departmentName}</TableCell>
                    <TableCell>Rs. {r.grossSalary.toLocaleString()}</TableCell>
                    <TableCell>Rs. {r.deductions.toLocaleString()}</TableCell>
                    <TableCell className="font-semibold">Rs. {r.netSalary.toLocaleString()}</TableCell>
                    <TableCell><Badge variant={statusVariant[r.paymentStatus]}>{r.paymentStatus}</Badge></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" asChild><Link href={`/payroll/${r.id}/slip`}>Slip</Link></Button>
                      {canEdit && r.paymentStatus === "PENDING" && (
                        <Button size="sm" onClick={() => handleMarkPaid(r.id)} disabled={markingPaid === r.id}>
                          {markingPaid === r.id ? "..." : "Mark Paid"}
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

      <GeneratePayrollDialog open={generateOpen} onOpenChange={setGenerateOpen} defaultMonth={month} defaultYear={year} onSaved={fetchData} />
    </div>
  );
}
