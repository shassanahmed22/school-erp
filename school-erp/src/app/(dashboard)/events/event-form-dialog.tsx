"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import type { AnnouncementAudience, EventItem, EventType } from "@/types";

const TYPES: { value: EventType; label: string }[] = [
  { value: "HOLIDAY", label: "Holiday" },
  { value: "EXAM", label: "Exam" },
  { value: "MEETING", label: "Meeting" },
  { value: "FUNCTION", label: "Function" },
  { value: "SPORTS", label: "Sports" },
  { value: "OTHER", label: "Other" },
];

const AUDIENCES: { value: AnnouncementAudience; label: string }[] = [
  { value: "ALL", label: "Everyone" },
  { value: "STUDENTS", label: "Students only" },
  { value: "PARENTS", label: "Parents only" },
  { value: "TEACHERS", label: "Teachers only" },
  { value: "STAFF", label: "Staff only" },
];

export function EventFormDialog({
  open, onOpenChange, editingEvent, defaultDate, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingEvent: EventItem | null;
  defaultDate: Date | null;
  onSaved: () => void;
}) {
  const isEdit = !!editingEvent;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<EventType>("OTHER");
  const [audience, setAudience] = useState<AnnouncementAudience>("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isAllDay, setIsAllDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingEvent) {
      setTitle(editingEvent.title);
      setDescription(editingEvent.description ?? "");
      setType(editingEvent.type);
      setAudience(editingEvent.audience);
      setStartDate(editingEvent.startDate.slice(0, 10));
      setEndDate(editingEvent.endDate.slice(0, 10));
      setIsAllDay(editingEvent.isAllDay);
      setStartTime(editingEvent.startTime ?? "09:00");
      setEndTime(editingEvent.endTime ?? "10:00");
      setLocation(editingEvent.location ?? "");
    } else {
      const d = defaultDate ? defaultDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      setTitle(""); setDescription(""); setType("OTHER"); setAudience("ALL");
      setStartDate(d); setEndDate(d); setIsAllDay(true); setStartTime("09:00"); setEndTime("10:00"); setLocation("");
    }
  }, [open, editingEvent, defaultDate]);

  async function handleSubmit() {
    if (!title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    if (!startDate || !endDate) { toast({ title: "Start and end dates are required", variant: "destructive" }); return; }
    if (endDate < startDate) { toast({ title: "End date cannot be before the start date", variant: "destructive" }); return; }

    setSubmitting(true);
    try {
      const payload = {
        title,
        description: description || undefined,
        type,
        audience,
        startDate,
        endDate,
        isAllDay,
        startTime: isAllDay ? undefined : startTime,
        endTime: isAllDay ? undefined : endTime,
        location: location || undefined,
      };
      const url = isEdit ? `/api/events/${editingEvent!.id}` : "/api/events";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: isEdit ? "Failed to update event" : "Failed to add event", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: isEdit ? "Event updated" : "Event added", variant: "success" });
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Event" : "Add Event"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Annual Sports Day" />
          </div>
          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as EventType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Audience</Label>
              <Select value={audience} onValueChange={(v) => setAudience(v as AnnouncementAudience)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{AUDIENCES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border border-input px-3 py-2.5">
            <p className="text-sm font-medium">All-day event</p>
            <Switch checked={isAllDay} onCheckedChange={setIsAllDay} />
          </div>
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Time</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>End Time</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Location (optional)</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Main Hall" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Saving..." : isEdit ? "Save Changes" : "Add Event"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
