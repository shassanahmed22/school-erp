"use client";

import { Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimetablePeriodItem } from "@/types";

const DAYS: { value: string; label: string }[] = [
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
  { value: "SATURDAY", label: "Saturday" },
];

export function TimetableGrid({
  periods,
  editable = false,
  maxPeriods = 8,
  onAddPeriod,
  onEditPeriod,
  onDeletePeriod,
}: {
  periods: TimetablePeriodItem[];
  editable?: boolean;
  maxPeriods?: number;
  onAddPeriod?: (day: string, periodNumber: number) => void;
  onEditPeriod?: (period: TimetablePeriodItem) => void;
  onDeletePeriod?: (period: TimetablePeriodItem) => void;
}) {
  const periodNumbers = Array.from(
    { length: Math.max(maxPeriods, ...periods.map((p) => p.periodNumber), 0) },
    (_, i) => i + 1
  );

  function findPeriod(day: string, periodNumber: number) {
    return periods.find((p) => p.dayOfWeek === day && p.periodNumber === periodNumber);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm min-w-[720px]">
        <thead>
          <tr>
            <th className="border bg-muted p-2 text-left w-20">Period</th>
            {DAYS.map((d) => (
              <th key={d.value} className="border bg-muted p-2 text-left">{d.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periodNumbers.map((num) => (
            <tr key={num}>
              <td className="border p-2 font-medium text-center align-top">{num}</td>
              {DAYS.map((d) => {
                const period = findPeriod(d.value, num);
                return (
                  <td key={d.value} className={cn("border p-1.5 align-top min-w-[110px]", editable && "group relative")}>
                    {period ? (
                      <div className="rounded-md bg-blue-50 dark:bg-blue-950/40 p-2 relative">
                        <p className="font-medium text-xs">{period.subjectName}</p>
                        <p className="text-[11px] text-muted-foreground">{period.startTime}–{period.endTime}</p>
                        {period.teacherName && <p className="text-[11px] text-muted-foreground truncate">{period.teacherName}</p>}
                        {period.roomNumber && <p className="text-[11px] text-muted-foreground">Room {period.roomNumber}</p>}
                        {editable && (
                          <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5">
                            <button onClick={() => onEditPeriod?.(period)} className="rounded bg-background/80 p-0.5">
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button onClick={() => onDeletePeriod?.(period)} className="rounded bg-background/80 p-0.5">
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : editable ? (
                      <button
                        onClick={() => onAddPeriod?.(d.value, num)}
                        className="flex h-14 w-full items-center justify-center rounded-md border border-dashed text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted/50 transition-opacity"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
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
    </div>
  );
}
