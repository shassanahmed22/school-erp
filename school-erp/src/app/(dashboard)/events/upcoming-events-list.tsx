"use client";

import { CalendarRange } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { EventItem } from "@/types";

const TYPE_LABELS: Record<string, string> = {
  HOLIDAY: "Holiday", EXAM: "Exam", MEETING: "Meeting", FUNCTION: "Function", SPORTS: "Sports", OTHER: "Other",
};

export function UpcomingEventsList({ events, onEventClick }: { events: EventItem[]; onEventClick: (event: EventItem) => void }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = events
    .filter((e) => new Date(e.endDate) >= today)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 6);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Upcoming Events</CardTitle></CardHeader>
      <CardContent>
        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CalendarRange className="h-6 w-6 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No upcoming events this month</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((e) => (
              <button
                key={e.id}
                onClick={() => onEventClick(e)}
                className="flex w-full items-start gap-3 text-left hover:bg-muted/50 rounded-md p-1.5 -m-1.5"
              >
                <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-md bg-muted text-center">
                  <span className="text-[10px] font-medium leading-none text-muted-foreground">
                    {new Date(e.startDate).toLocaleDateString(undefined, { month: "short" })}
                  </span>
                  <span className="text-sm font-semibold leading-tight">{new Date(e.startDate).getDate()}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{e.title}</p>
                  <Badge variant="secondary" className="mt-0.5">{TYPE_LABELS[e.type] ?? e.type}</Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
