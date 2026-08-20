"use client";

import { useEffect, useState, useCallback } from "react";
import { History } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import type { InventoryTransactionRow } from "@/types";

const typeVariant: Record<string, "success" | "destructive" | "secondary"> = {
  STOCK_IN: "success",
  STOCK_OUT: "destructive",
  ADJUSTMENT: "secondary",
};

export function InventoryTransactionsTab() {
  const [transactions, setTransactions] = useState<InventoryTransactionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory-transactions");
      const json = await res.json();
      setTransactions(res.ok ? json.data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  return (
    <Card className="p-4">
      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : transactions.length === 0 ? (
        <EmptyState title="No stock transactions yet" icon={<History className="h-6 w-6 text-muted-foreground" />} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.itemName}</TableCell>
                <TableCell><Badge variant={typeVariant[t.type] ?? "secondary"}>{t.type.replace("_", " ")}</Badge></TableCell>
                <TableCell>{t.quantity} {t.unit.toLowerCase()}</TableCell>
                <TableCell className="text-muted-foreground">{t.reason || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
