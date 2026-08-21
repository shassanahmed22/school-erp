"use client";

import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import type { BookIssueItem } from "@/types";
import { formatDate } from "@/lib/utils";

const statusVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  ISSUED: "secondary", RETURNED: "success", OVERDUE: "destructive", LOST: "destructive",
};

export function MyLibraryView() {
  const [rows, setRows] = useState<BookIssueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/book-issues?limit=50").then((r) => r.json()).then((j) => setRows(j.data ?? [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <TableSkeleton rows={6} cols={4} />;

  return (
    <Card className="p-4">
      {rows.length === 0 ? (
        <EmptyState title="No library records yet" description="Books you've borrowed will appear here." icon={<BookOpen className="h-6 w-6 text-muted-foreground" />} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Book</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fine</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.bookTitle}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(r.issueDate)}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(r.dueDate)}</TableCell>
                <TableCell><Badge variant={statusVariant[r.status]}>{r.status}</Badge></TableCell>
                <TableCell>{r.fineAmount > 0 ? `Rs. ${r.fineAmount.toLocaleString()}${r.finePaid ? " (paid)" : ""}` : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
