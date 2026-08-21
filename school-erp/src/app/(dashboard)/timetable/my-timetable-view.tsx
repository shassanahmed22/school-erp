"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { TimetableGrid } from "./timetable-grid";
import type { TimetablePeriodItem } from "@/types";

export function MyTimetableView() {
  const [periods, setPeriods] = useState<TimetablePeriodItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/timetable")
      .then((r) => r.json())
      .then((j) => setPeriods(j.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-96 rounded-lg" />;

  if (periods.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No timetable available yet"
          description="Your class timetable hasn't been published yet. Please check back later."
          icon={<CalendarDays className="h-6 w-6 text-muted-foreground" />}
        />
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <TimetableGrid periods={periods} editable={false} />
    </Card>
  );
}
