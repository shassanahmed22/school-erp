"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, ChevronLeft, ChevronRight, Receipt } from "lucide-react";
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
import type { FeePaymentItem } from "@/types";
import { formatDate } from "@/lib/utils";
import { RecordPaymentDialog } from "./record-payment-dialog";

const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "CARD", "CHEQUE", "ONLINE", "OTHER"];

export function PaymentsTab() {
  const canRecord = usePermission("fee-payments.create");

  const [rows, setRows] = useState<FeePaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [recordOpen, setRecordOpen] = useState(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (method !== "ALL") params.set("paymentMethod", method);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`/api/fee-payments?${params}`);
      const json = await res.json();
      setRows(res.ok ? json.data : []);
      setTotalPages(json.pagination?.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  }, [method, startDate, endDate, page]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const exportRows = rows.map((p) => [
    p.receiptNumber, p.studentName, p.registrationNumber, p.feeCategoryName,
    p.amountPaid, formatDate(p.paymentDate), p.paymentMethod, p.referenceNumber ?? "", p.collectedByName ?? "",
  ]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <Select value={method} onValueChange={(v) => { setMethod(v); setPage(1); }}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Methods</SelectItem>
              {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" className="w-40" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} />
          <Input type="date" className="w-40" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} />
        </div>
        <div className="flex gap-2">
          <ExportButtons
            filename="fee-payments"
            headers={["Receipt #", "Student", "Reg #", "Category", "Amount", "Date", "Method", "Reference", "Collected By"]}
            rows={exportRows}
          />
          {canRecord && (
            <Button onClick={() => setRecordOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Record Payment
            </Button>
          )}
        </div>
      </div>

      <Card className="p-4">
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : rows.length === 0 ? (
          <EmptyState title="No payments recorded" description="Record a payment to see it appear here." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{p.receiptNumber}</TableCell>
                    <TableCell>
                      <p className="font-medium">{p.studentName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{p.registrationNumber}</p>
                    </TableCell>
                    <TableCell>{p.feeCategoryName}</TableCell>
                    <TableCell>Rs. {p.amountPaid.toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(p.paymentDate)}</TableCell>
                    <TableCell><Badge variant="secondary">{p.paymentMethod.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/fees/payments/${p.id}/receipt`}><Receipt className="mr-1.5 h-3.5 w-3.5" /> Receipt</Link>
                      </Button>
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

      <RecordPaymentDialog open={recordOpen} onOpenChange={setRecordOpen} onSaved={fetchRows} />
    </div>
  );
}
