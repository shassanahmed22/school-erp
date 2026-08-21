"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import type { SubjectItem, TeacherListItem, TimetablePeriodItem } from "@/types";

export function PeriodFormDialog({
  open, onOpenChange, sectionId, day, periodNumber, subjects, teachers, editingPeriod, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionId: string;
  day: string;
  periodNumber: number;
  subjects: SubjectItem[];
  teachers: TeacherListItem[];
  editingPeriod: TimetablePeriodItem | null;
  onSaved: () => void;
}) {
  const isEdit = !!editingPeriod;
  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState<string>("none");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("08:40");
  const [roomNumber, setRoomNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingPeriod) {
      setSubjectId(editingPeriod.subjectId);
      setTeacherId(editingPeriod.teacherId ?? "none");
      setStartTime(editingPeriod.startTime);
      setEndTime(editingPeriod.endTime);
      setRoomNumber(editingPeriod.roomNumber ?? "");
    } else {
      setSubjectId(""); setTeacherId("none"); setStartTime("08:00"); setEndTime("08:40"); setRoomNumber("");
    }
  }, [open, editingPeriod]);

  async function handleSubmit() {
    if (!subjectId) { toast({ title: "Please select a subject", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const payload = {
        sectionId,
        subjectId,
        teacherId: teacherId === "none" ? undefined : teacherId,
        dayOfWeek: day,
        periodNumber,
        startTime,
        endTime,
        roomNumber: roomNumber || undefined,
      };
      const url = isEdit ? `/api/timetable/${editingPeriod!.id}` : "/api/timetable";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: isEdit ? "Failed to update period" : "Failed to schedule period", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: isEdit ? "Period updated" : "Period scheduled", variant: "success" });
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Period" : `Schedule Period — ${day.charAt(0) + day.slice(1).toLowerCase()}, Period ${periodNumber}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Teacher (optional)</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>)}
              </SelectContent>
            </Select>
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
            <Label>Room Number (optional)</Label>
            <Input value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="e.g. Room 12" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Saving..." : isEdit ? "Save Changes" : "Schedule"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
