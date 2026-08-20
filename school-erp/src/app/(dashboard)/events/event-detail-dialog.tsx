"use client";

import { MapPin, Clock, Pencil, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { EventItem } from "@/types";

const TYPE_LABELS: Record<string, string> = {
  HOLIDAY: "Holiday", EXAM: "Exam", MEETING: "Meeting", FUNCTION: "Function", SPORTS: "Sports", OTHER: "Other",
};

export function EventDetailDialog({
  open, onOpenChange, event, canEdit, canDelete, onEdit, onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: EventItem | null;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (event: EventItem) => void;
  onDelete: (event: EventItem) => void;
}) {
  if (!event) return null;

  const sameDay = event.startDate.slice(0, 10) === event.endDate.slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{TYPE_LABELS[event.type] ?? event.type}</Badge>
            <Badge variant="secondary">{event.audience === "ALL" ? "Everyone" : event.audience}</Badge>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              {sameDay
                ? new Date(event.startDate).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })
                : `${new Date(event.startDate).toLocaleDateString()} – ${new Date(event.endDate).toLocaleDateString()}`}
            </p>
            {!event.isAllDay && event.startTime && (
              <p className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {event.startTime} – {event.endTime}</p>
            )}
            {event.location && (
              <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {event.location}</p>
            )}
          </div>

          {event.description && <p className="text-sm whitespace-pre-wrap">{event.description}</p>}

          <p className="text-xs text-muted-foreground">Added by {event.createdBy}</p>
        </div>
        <DialogFooter className="justify-between sm:justify-between">
          <div className="flex gap-2">
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(event)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
              </Button>
            )}
            {canDelete && (
              <Button variant="outline" size="sm" onClick={() => onDelete(event)}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5 text-destructive" /> Delete
              </Button>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
