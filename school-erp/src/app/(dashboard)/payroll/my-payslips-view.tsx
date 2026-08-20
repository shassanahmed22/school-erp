"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Banknote } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import type { PayrollItem } from "@/types";

const MONTHS = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const statusVariant: Record<string, "success" | "warning" | "destructive"> = {
  PAID: "success", PENDING: "warning", FAILED: "destructive",
};

export function MyPayslipsView() {
  const [rows, setRows] = useState<PayrollItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/payroll?limit=24").then((r) => r.json()).then((j) => setRows(j.data ?? [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <TableSkeleton rows={6} cols={4} />;

  return (
    <Card className="p-4">
      {rows.length === 0 ? (
        <EmptyState title="No payslips yet" description="Your salary records will appear here once processed by HR." icon={<Banknote className="h-6 w-6 text-muted-foreground" />} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Gross Salary</TableHead>
              <TableHead>Net Salary</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{MONTHS[r.month]} {r.year}</TableCell>
                <TableCell>Rs. {r.grossSalary.toLocaleString()}</TableCell>
                <TableCell className="font-semibold">Rs. {r.netSalary.toLocaleString()}</TableCell>
                <TableCell><Badge variant={statusVariant[r.paymentStatus]}>{r.paymentStatus}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" asChild><Link href={`/payroll/${r.id}/slip`}>View Slip</Link></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
