"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import type { AssignmentItem, AssignmentStatus, SubjectItem } from "@/types";

export function AssignmentFormDialog({
  open, onOpenChange, sectionId, subjects, editingAssignment, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionId: string;
  subjects: SubjectItem[];
  editingAssignment: AssignmentItem | null;
  onSaved: () => void;
}) {
  const isEdit = !!editingAssignment;
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [maxMarks, setMaxMarks] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<AssignmentStatus>("PUBLISHED");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingAssignment) {
      setSubjectId(editingAssignment.subjectId);
      setTitle(editingAssignment.title);
      setDescription(editingAssignment.description);
      setAttachmentUrl(editingAssignment.attachmentUrl ?? "");
      setMaxMarks(editingAssignment.maxMarks?.toString() ?? "");
      setDueDate(editingAssignment.dueDate.slice(0, 10));
      setStatus(editingAssignment.status);
    } else {
      setSubjectId(""); setTitle(""); setDescription(""); setAttachmentUrl(""); setMaxMarks(""); setDueDate(""); setStatus("PUBLISHED");
    }
  }, [open, editingAssignment]);

  async function handleSubmit() {
    if (!subjectId) { toast({ title: "Please select a subject", variant: "destructive" }); return; }
    if (!title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    if (!description.trim()) { toast({ title: "Description is required", variant: "destructive" }); return; }
    if (!dueDate) { toast({ title: "Due date is required", variant: "destructive" }); return; }

    setSubmitting(true);
    try {
      const payload = {
        sectionId,
        subjectId,
        title,
        description,
        attachmentUrl: attachmentUrl || undefined,
        maxMarks: maxMarks ? Number(maxMarks) : undefined,
        dueDate,
        status,
      };
      const url = isEdit ? `/api/assignments/${editingAssignment!.id}` : "/api/assignments";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: isEdit ? "Failed to update assignment" : "Failed to post assignment", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: isEdit ? "Assignment updated" : "Assignment posted", variant: "success" });
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Assignment" : "Post New Assignment"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 5 Exercise" />
          </div>
          <div className="space-y-1.5">
            <Label>Description / Instructions</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="What should students do?" />
          </div>
          <div className="space-y-1.5">
            <Label>Attachment URL (optional)</Label>
            <Input value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Max Marks (optional)</Label>
              <Input type="number" min={1} value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as AssignmentStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Saving..." : isEdit ? "Save Changes" : "Post Assignment"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
