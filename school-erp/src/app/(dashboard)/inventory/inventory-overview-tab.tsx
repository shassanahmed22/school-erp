"use client";

import { useEffect, useState } from "react";
import { Boxes, Layers, DollarSign, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface InventoryDashboard {
  totalItems: number;
  totalCategories: number;
  totalStockValue: number;
  lowStockCount: number;
  lowStockItems: { name: string; quantity: number; reorderLevel: number; unit: string }[];
  recentTransactions: { id: string; itemName: string; unit: string; type: string; quantity: number; createdAt: string }[];
}

const typeVariant: Record<string, "success" | "destructive" | "secondary"> = {
  STOCK_IN: "success",
  STOCK_OUT: "destructive",
  ADJUSTMENT: "secondary",
};

export function InventoryOverviewTab() {
  const [data, setData] = useState<InventoryDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/inventory-dashboard").then((r) => r.json()).then((j) => setData(j.data)).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
      </div>
    );
  }
  if (!data) return <p className="text-sm text-muted-foreground">Unable to load inventory data.</p>;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total Items" value={data.totalItems} icon={<Boxes className="h-5 w-5 text-white" />} colorClass="bg-blue-600" />
        <StatCard label="Categories" value={data.totalCategories} icon={<Layers className="h-5 w-5 text-white" />} colorClass="bg-purple-600" />
        <StatCard label="Stock Value" value={`Rs. ${data.totalStockValue.toLocaleString()}`} icon={<DollarSign className="h-5 w-5 text-white" />} colorClass="bg-green-600" />
        <StatCard label="Low Stock Items" value={data.lowStockCount} icon={<AlertTriangle className="h-5 w-5 text-white" />} colorClass="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Low Stock Alerts</CardTitle></CardHeader>
          <CardContent>
            {data.lowStockItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">All items are sufficiently stocked.</p>
            ) : (
              <div className="space-y-3">
                {data.lowStockItems.map((i, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span>{i.name}</span>
                    <Badge variant="destructive">{i.quantity} / {i.reorderLevel} {i.unit.toLowerCase()}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Stock Transactions</CardTitle></CardHeader>
          <CardContent>
            {data.recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stock movement recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {data.recentTransactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{t.itemName}</p>
                      <p className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</p>
                    </div>
                    <Badge variant={typeVariant[t.type] ?? "secondary"}>{t.type.replace("_", " ")} · {t.quantity} {t.unit.toLowerCase()}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
