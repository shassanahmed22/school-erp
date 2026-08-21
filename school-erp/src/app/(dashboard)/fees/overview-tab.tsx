"use client";

import { useEffect, useState } from "react";
import { Wallet, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface FinanceDashboardData {
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  monthlyCollection: number;
  monthlyTrend: { month: string; collected: number }[];
  recentPayments: {
    id: string; receiptNumber: string; studentName: string; registrationNumber: string;
    feeCategoryName: string; amountPaid: number; paymentDate: string; paymentMethod: string;
  }[];
  statusBreakdown: { status: string; count: number; totalAmount: number }[];
}

const statusColor: Record<string, string> = {
  PENDING: "bg-amber-500", PARTIALLY_PAID: "bg-blue-500", PAID: "bg-green-500", OVERDUE: "bg-red-500", WAIVED: "bg-slate-400",
};

export function OverviewTab() {
  const [data, setData] = useState<FinanceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/finance-dashboard").then((r) => r.json()).then((j) => setData(j.data)).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
      </div>
    );
  }

  if (!data) return <p className="text-sm text-muted-foreground">Unable to load finance data.</p>;

  const maxTrend = Math.max(...data.monthlyTrend.map((m) => m.collected), 1);
  const totalStatusAmount = data.statusBreakdown.reduce((sum, s) => sum + s.totalAmount, 0) || 1;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total Fees Collected" value={`Rs. ${data.totalCollected.toLocaleString()}`} icon={<Wallet className="h-5 w-5 text-white" />} colorClass="bg-green-600" />
        <StatCard label="Pending Fees" value={`Rs. ${data.totalPending.toLocaleString()}`} icon={<Clock className="h-5 w-5 text-white" />} colorClass="bg-amber-500" />
        <StatCard label="Overdue Fees" value={`Rs. ${data.totalOverdue.toLocaleString()}`} icon={<AlertTriangle className="h-5 w-5 text-white" />} colorClass="bg-red-600" />
        <StatCard label="This Month's Collection" value={`Rs. ${data.monthlyCollection.toLocaleString()}`} icon={<TrendingUp className="h-5 w-5 text-white" />} colorClass="bg-blue-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Monthly Collection Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-40">
              {data.monthlyTrend.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex items-end h-32">
                    <div
                      className="w-full rounded-t bg-blue-600"
                      style={{ height: `${Math.max((m.collected / maxTrend) * 100, 2)}%` }}
                      title={`Rs. ${m.collected.toLocaleString()}`}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{m.month}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Collection Statistics</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.statusBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No fee assignments yet.</p>
            ) : (
              data.statusBreakdown.map((s) => (
                <div key={s.status}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{s.status.replace(/_/g, " ")} ({s.count})</span>
                    <span className="text-muted-foreground">Rs. {s.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${statusColor[s.status] ?? "bg-slate-400"}`} style={{ width: `${(s.totalAmount / totalStatusAmount) * 100}%` }} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>Recent Payments</CardTitle></CardHeader>
        <CardContent>
          {data.recentPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <ul className="divide-y">
              {data.recentPayments.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{p.studentName} <span className="text-xs text-muted-foreground font-mono">({p.registrationNumber})</span></p>
                    <p className="text-xs text-muted-foreground">{p.feeCategoryName} · {p.receiptNumber} · {formatDate(p.paymentDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">Rs. {p.amountPaid.toLocaleString()}</p>
                    <Badge variant="secondary" className="text-[10px]">{p.paymentMethod.replace(/_/g, " ")}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
