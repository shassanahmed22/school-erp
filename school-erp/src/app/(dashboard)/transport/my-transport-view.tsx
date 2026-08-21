"use client";

import { useEffect, useState } from "react";
import { Bus, MapPin, Banknote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import type { StudentTransportItem } from "@/types";
import { formatDate } from "@/lib/utils";

export function MyTransportView() {
  const [assignment, setAssignment] = useState<StudentTransportItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/student-transport?status=ACTIVE&limit=1")
      .then((r) => r.json())
      .then((j) => setAssignment(j.data?.[0] ?? null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <TableSkeleton rows={3} cols={2} />;

  if (!assignment) {
    return (
      <Card className="p-8">
        <EmptyState title="No transport assigned" description="You are not currently assigned to a school transport route." icon={<Bus className="h-6 w-6 text-muted-foreground" />} />
      </Card>
    );
  }

  return (
    <Card className="max-w-md">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-11 w-11 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
            <Bus className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold">{assignment.routeName}</p>
            <p className="text-xs text-muted-foreground">Assigned since {formatDate(assignment.assignedDate)}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border p-3 flex items-center gap-2">
            <Banknote className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Monthly Fee</p>
              <p className="font-medium">Rs. {assignment.monthlyFee.toLocaleString()}</p>
            </div>
          </div>
          <div className="rounded-lg border p-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Route</p>
              <p className="font-medium">{assignment.routeName}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
