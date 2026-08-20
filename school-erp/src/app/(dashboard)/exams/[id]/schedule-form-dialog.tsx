"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";

interface ExistingSchedule {
  id: string;
  examDate: string;
  startTime: string;
  endTime: string;
  room: string | null;
}

export function ScheduleFormDialog({
  open, onOpenChange, examSubjectId, existing, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examSubjectId: string | null;
  existing: ExistingSchedule | null;
  onSaved: () => void;
}) {
  const [examDate, setExamDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [room, setRoom] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setExamDate(existing ? existing.examDate.slice(0, 10) : "");
      setStartTime(existing?.startTime ?? "09:00");
      setEndTime(existing?.endTime ?? "11:00");
      setRoom(existing?.room ?? "");
    }
  }, [open, existing]);

  async function handleSave() {
    if (!examSubjectId || !examDate) {
      toast({ title: "Exam date is required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const url = existing ? `/api/exam-schedules/${existing.id}` : "/api/exam-schedules";
      const method = existing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examSubjectId, examDate, startTime, endTime, room: room || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Failed to save schedule", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: "Schedule saved", variant: "success" });
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{existing ? "Edit" : "Add"} Exam Schedule</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Exam Date</Label>
            <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          </div>
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
          <div className="space-y-1.5">
            <Label>Room (optional)</Label>
            <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. Room 12" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={submitting}>{submitting ? "Saving..." : "Save Schedule"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
