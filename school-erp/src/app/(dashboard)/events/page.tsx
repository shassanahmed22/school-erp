"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { usePermission } from "@/hooks/use-permission";
import { toast } from "@/components/ui/toaster";
import { CalendarGrid } from "./calendar-grid";
import { EventFormDialog } from "./event-form-dialog";
import { EventDetailDialog } from "./event-detail-dialog";
import { UpcomingEventsList } from "./upcoming-events-list";
import type { EventItem } from "@/types";

export default function EventsPage() {
  const canCreate = usePermission("events.create");
  const canEdit = usePermission("events.edit");
  const canDelete = usePermission("events.delete");

  const [month, setMonth] = useState(() => new Date());
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | null>(null);

  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const start = new Date(month.getFullYear(), month.getMonth(), 1).toISOString().slice(0, 10);
      const end = new Date(month.getFullYear(), month.getMonth() + 1, 0).toISOString().slice(0, 10);
      const res = await fetch(`/api/events?start=${start}&end=${end}`);
      const json = await res.json();
      setEvents(res.ok ? json.data : []);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  function handleEventClick(event: EventItem) {
    setSelectedEvent(event);
    setDetailOpen(true);
  }

  function handleDayAdd(day: Date) {
    if (!canCreate) return;
    setEditingEvent(null);
    setDefaultDate(day);
    setFormOpen(true);
  }

  function handleEdit(event: EventItem) {
    setDetailOpen(false);
    setEditingEvent(event);
    setDefaultDate(null);
    setFormOpen(true);
  }

  function handleDeleteRequest(event: EventItem) {
    setDetailOpen(false);
    setDeleteTarget(event);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/events/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Failed to delete event", description: json.message, variant: "destructive" }); return; }
      toast({ title: "Event deleted", variant: "success" });
      setDeleteTarget(null);
      fetchEvents();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Events & Calendar"
        description="School holidays, exams, meetings, and other events at a glance."
        actions={canCreate ? (
          <Button onClick={() => { setEditingEvent(null); setDefaultDate(new Date()); setFormOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Event
          </Button>
        ) : undefined}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <Card className="p-4">
          {loading ? (
            <Skeleton className="h-96 rounded-lg" />
          ) : (
            <CalendarGrid
              month={month}
              events={events}
              onMonthChange={setMonth}
              onEventClick={handleEventClick}
              onDayAddClick={canCreate ? handleDayAdd : undefined}
            />
          )}
        </Card>

        <UpcomingEventsList events={events} onEventClick={handleEventClick} />
      </div>

      <EventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editingEvent={editingEvent}
        defaultDate={defaultDate}
        onSaved={fetchEvents}
      />

      <EventDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        event={selectedEvent}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={handleEdit}
        onDelete={handleDeleteRequest}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete event?"
        description="This will remove the event from everyone's calendar."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
