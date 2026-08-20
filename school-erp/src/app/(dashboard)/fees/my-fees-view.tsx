"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Receipt, Wallet, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { StatCard } from "@/components/shared/stat-card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import type { StudentFeeItem, FeePaymentItem } from "@/types";
import { formatDate } from "@/lib/utils";

const statusVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  PENDING: "warning", PARTIALLY_PAID: "secondary", PAID: "success", OVERDUE: "destructive", WAIVED: "secondary",
};

export function MyFeesView() {
  const [fees, setFees] = useState<StudentFeeItem[]>([]);
  const [payments, setPayments] = useState<FeePaymentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/student-fees?limit=100").then((r) => r.json()),
      fetch("/api/fee-payments?limit=20").then((r) => r.json()),
    ]).then(([feesJson, paymentsJson]) => {
      setFees(feesJson.data ?? []);
      setPayments(paymentsJson.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <TableSkeleton rows={6} cols={5} />;

  const totalDue = fees.reduce((sum, f) => sum + (f.finalAmount - f.paidAmount), 0);
  const totalPaid = fees.reduce((sum, f) => sum + f.paidAmount, 0);
  const overdueCount = fees.filter((f) => f.status === "OVERDUE").length;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Paid" value={`Rs. ${totalPaid.toLocaleString()}`} icon={<Wallet className="h-5 w-5 text-white" />} colorClass="bg-green-600" />
        <StatCard label="Balance Due" value={`Rs. ${totalDue.toLocaleString()}`} icon={<Clock className="h-5 w-5 text-white" />} colorClass="bg-amber-500" />
        <StatCard label="Overdue Items" value={overdueCount} icon={<Receipt className="h-5 w-5 text-white" />} colorClass="bg-red-600" />
      </div>

      <Card className="p-4 mb-4">
        <h3 className="font-semibold mb-3">Fee Breakdown</h3>
        {fees.length === 0 ? (
          <EmptyState title="No fees assigned yet" description="Your fee records will appear here once assigned by the school." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fees.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>{f.feeCategoryName}</TableCell>
                  <TableCell>Rs. {f.finalAmount.toLocaleString()}</TableCell>
                  <TableCell>Rs. {f.paidAmount.toLocaleString()}</TableCell>
                  <TableCell>Rs. {(f.finalAmount - f.paidAmount).toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(f.dueDate)}</TableCell>
                  <TableCell><Badge variant={statusVariant[f.status]}>{f.status.replace(/_/g, " ")}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-3">Payment History & Receipts</h3>
        {payments.length === 0 ? (
          <EmptyState title="No payments yet" />
        ) : (
          <ul className="divide-y">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium">{p.feeCategoryName}</p>
                  <p className="text-xs text-muted-foreground">{p.receiptNumber} · {formatDate(p.paymentDate)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">Rs. {p.amountPaid.toLocaleString()}</span>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/fees/payments/${p.id}/receipt`}>Download Receipt</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
