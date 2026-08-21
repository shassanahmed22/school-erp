"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import type { ClassItem, SubjectItem } from "@/types";

export function AssignClassDialog({
  open, onOpenChange, subject, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: SubjectItem | null;
  onSaved: () => void;
}) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classId, setClassId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetch("/api/classes").then((r) => r.json()).then((j) => setClasses(j.data ?? []));
      setClassId("");
    }
  }, [open]);

  async function handleAssign() {
    if (!subject || !classId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/class-subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, subjectId: subject.id, isElective: false }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Failed to assign subject", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: `${subject.name} assigned to class`, variant: "success" });
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Assign &quot;{subject?.name}&quot; to a Class</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAssign} disabled={submitting || !classId}>{submitting ? "Assigning..." : "Assign"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
