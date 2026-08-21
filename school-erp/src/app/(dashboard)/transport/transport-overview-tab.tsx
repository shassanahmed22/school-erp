"use client";

import { useEffect, useState } from "react";
import { Bus, Route as RouteIcon, Users, UserCog } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface TransportDashboard {
  totalVehicles: number;
  activeVehicles: number;
  totalRoutes: number;
  totalDrivers: number;
  assignedStudents: number;
  routeUtilization: { routeName: string; vehicleNumber: string | null; capacity: number | null; assigned: number }[];
}

export function TransportOverviewTab() {
  const [data, setData] = useState<TransportDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/transport-dashboard").then((r) => r.json()).then((j) => setData(j.data)).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
      </div>
    );
  }
  if (!data) return <p className="text-sm text-muted-foreground">Unable to load transport data.</p>;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Vehicles" value={`${data.activeVehicles}/${data.totalVehicles}`} icon={<Bus className="h-5 w-5 text-white" />} colorClass="bg-blue-600" />
        <StatCard label="Routes" value={data.totalRoutes} icon={<RouteIcon className="h-5 w-5 text-white" />} colorClass="bg-purple-600" />
        <StatCard label="Drivers" value={data.totalDrivers} icon={<UserCog className="h-5 w-5 text-white" />} colorClass="bg-amber-500" />
        <StatCard label="Assigned Students" value={data.assignedStudents} icon={<Users className="h-5 w-5 text-white" />} colorClass="bg-green-600" />
      </div>

      <Card>
        <CardHeader><CardTitle>Route Utilization</CardTitle></CardHeader>
        <CardContent>
          {data.routeUtilization.length === 0 ? (
            <p className="text-sm text-muted-foreground">No routes created yet.</p>
          ) : (
            <ul className="space-y-3">
              {data.routeUtilization.map((r, i) => {
                const pct = r.capacity ? Math.min((r.assigned / r.capacity) * 100, 100) : 0;
                return (
                  <li key={i}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>{r.routeName} {r.vehicleNumber && <span className="text-muted-foreground">({r.vehicleNumber})</span>}</span>
                      <Badge variant="secondary">{r.assigned}{r.capacity ? ` / ${r.capacity}` : ""}</Badge>
                    </div>
                    {r.capacity && (
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-blue-600" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
