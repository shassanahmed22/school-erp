"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import type { TeacherSchedulePeriod } from "@/types";

const DAYS: { value: string; label: string }[] = [
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
  { value: "SATURDAY", label: "Saturday" },
];

export function TeacherScheduleView() {
  const [periods, setPeriods] = useState<TeacherSchedulePeriod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/timetable/my-schedule")
      .then((r) => r.json())
      .then((j) => setPeriods(j.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-96 rounded-lg" />;

  if (periods.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No classes scheduled yet"
          description="Your teaching schedule hasn't been set up yet. Please check back later."
          icon={<CalendarDays className="h-6 w-6 text-muted-foreground" />}
        />
      </Card>
    );
  }

  const maxPeriod = Math.max(8, ...periods.map((p) => p.periodNumber));
  const periodNumbers = Array.from({ length: maxPeriod }, (_, i) => i + 1);

  return (
    <Card className="p-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm min-w-[720px]">
        <thead>
          <tr>
            <th className="border bg-muted p-2 text-left w-20">Period</th>
            {DAYS.map((d) => <th key={d.value} className="border bg-muted p-2 text-left">{d.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {periodNumbers.map((num) => (
            <tr key={num}>
              <td className="border p-2 font-medium text-center align-top">{num}</td>
              {DAYS.map((d) => {
                const period = periods.find((p) => p.dayOfWeek === d.value && p.periodNumber === num);
                return (
                  <td key={d.value} className="border p-1.5 align-top min-w-[110px]">
                    {period ? (
                      <div className="rounded-md bg-green-50 dark:bg-green-950/40 p-2">
                        <p className="font-medium text-xs">{period.subjectName}</p>
                        <p className="text-[11px] text-muted-foreground">{period.className} - {period.sectionName}</p>
                        <p className="text-[11px] text-muted-foreground">{period.startTime}–{period.endTime}</p>
                        {period.roomNumber && <p className="text-[11px] text-muted-foreground">Room {period.roomNumber}</p>}
                      </div>
                    ) : (
                      <div className="h-14" />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
