"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EventItem, EventType } from "@/types";

const TYPE_COLORS: Record<EventType, string> = {
  HOLIDAY: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  EXAM: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
  MEETING: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  FUNCTION: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300",
  SPORTS: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
  OTHER: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function eventsOnDay(events: EventItem[], day: Date) {
  return events.filter((e) => {
    const start = new Date(e.startDate);
    const end = new Date(e.endDate);
    const d = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    return d >= new Date(start.getFullYear(), start.getMonth(), start.getDate()) && d <= new Date(end.getFullYear(), end.getMonth(), end.getDate());
  });
}

export function CalendarGrid({
  month, events, onMonthChange, onEventClick, onDayAddClick,
}: {
  month: Date;
  events: EventItem[];
  onMonthChange: (month: Date) => void;
  onEventClick: (event: EventItem) => void;
  onDayAddClick?: (day: Date) => void;
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const startOffset = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, monthIndex, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-lg">{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h3>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onMonthChange(new Date())}>Today</Button>
          <Button variant="outline" size="icon" onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border">
        {WEEKDAYS.map((w) => (
          <div key={w} className="bg-muted p-2 text-xs font-medium text-center text-muted-foreground">{w}</div>
        ))}
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} className="bg-background min-h-[100px]" />;
          const dayEvents = eventsOnDay(events, day);
          const isToday = isSameDay(day, today);
          return (
            <div
              key={idx}
              className={cn("bg-background min-h-[100px] p-1.5 group relative", onDayAddClick && "cursor-pointer hover:bg-muted/40")}
              onClick={() => onDayAddClick?.(day)}
            >
              <p className={cn("text-xs font-medium mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full", isToday && "bg-primary text-primary-foreground")}>
                {day.getDate()}
              </p>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 2).map((e) => (
                  <button
                    key={e.id}
                    onClick={(ev) => { ev.stopPropagation(); onEventClick(e); }}
                    className={cn("w-full truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium", TYPE_COLORS[e.type])}
                  >
                    {e.title}
                  </button>
                ))}
                {dayEvents.length > 2 && (
                  <p className="text-[10px] text-muted-foreground pl-1">+{dayEvents.length - 2} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
