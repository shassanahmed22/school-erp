"use client";

import { useEffect, useState } from "react";
import { BookOpen, Layers, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface LibraryDashboard {
  totalBooks: number;
  totalCopies: number;
  issuedCount: number;
  overdueCount: number;
  overdueList: { id: string; bookTitle: string; studentName: string; registrationNumber: string; dueDate: string; fineAmount: number }[];
}

export function LibraryOverviewTab() {
  const [data, setData] = useState<LibraryDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/library-dashboard").then((r) => r.json()).then((j) => setData(j.data)).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
      </div>
    );
  }
  if (!data) return <p className="text-sm text-muted-foreground">Unable to load library data.</p>;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total Books" value={data.totalBooks} icon={<BookOpen className="h-5 w-5 text-white" />} colorClass="bg-blue-600" />
        <StatCard label="Total Copies" value={data.totalCopies} icon={<Layers className="h-5 w-5 text-white" />} colorClass="bg-purple-600" />
        <StatCard label="Issued Books" value={data.issuedCount} icon={<BookOpen className="h-5 w-5 text-white" />} colorClass="bg-amber-500" />
        <StatCard label="Overdue Books" value={data.overdueCount} icon={<AlertTriangle className="h-5 w-5 text-white" />} colorClass="bg-red-600" />
      </div>

      <Card>
        <CardHeader><CardTitle>Overdue Books</CardTitle></CardHeader>
        <CardContent>
          {data.overdueList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No overdue books. 🎉</p>
          ) : (
            <ul className="divide-y">
              {data.overdueList.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{o.bookTitle}</p>
                    <p className="text-xs text-muted-foreground">{o.studentName} ({o.registrationNumber}) · Due {formatDate(o.dueDate)}</p>
                  </div>
                  <Badge variant="destructive">Rs. {o.fineAmount.toLocaleString()} fine</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
