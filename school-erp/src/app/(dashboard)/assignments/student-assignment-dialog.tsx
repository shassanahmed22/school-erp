"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import type { AssignmentItem } from "@/types";

export function StudentAssignmentDialog({
  open, onOpenChange, assignment, onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: AssignmentItem | null;
  onSubmitted: () => void;
}) {
  const [content, setContent] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && assignment) { setContent(""); setAttachmentUrl(""); }
  }, [open, assignment]);

  async function handleSubmit() {
    if (!assignment) return;
    if (!content.trim() && !attachmentUrl.trim()) {
      toast({ title: "Please write an answer or add an attachment link", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/assignments/${assignment.id}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content || undefined, attachmentUrl: attachmentUrl || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Failed to submit", description: json.message, variant: "destructive" }); return; }
      toast({ title: json.message ?? "Submitted successfully", variant: "success" });
      onOpenChange(false);
      onSubmitted();
    } finally {
      setSubmitting(false);
    }
  }

  if (!assignment) return null;

  const isPastDue = new Date() > new Date(assignment.dueDate);
  const already = assignment.mySubmission;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{assignment.title}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{assignment.subjectName}</Badge>
            <span>Due {new Date(assignment.dueDate).toLocaleDateString()}</span>
            {assignment.maxMarks && <span>· {assignment.maxMarks} marks</span>}
          </div>

          <p className="text-sm whitespace-pre-wrap">{assignment.description}</p>

          {assignment.attachmentUrl && (
            <a href={assignment.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">
              View attachment
            </a>
          )}

          <div className="border-t pt-4">
            {already?.status === "GRADED" ? (
              <div className="rounded-md bg-green-50 dark:bg-green-950/40 p-3 space-y-1">
                <p className="text-sm font-medium">Graded: {already.marksObtained}{assignment.maxMarks && ` / ${assignment.maxMarks}`}</p>
                {already.feedback && <p className="text-sm text-muted-foreground">{already.feedback}</p>}
              </div>
            ) : already ? (
              <div className="rounded-md bg-blue-50 dark:bg-blue-950/40 p-3">
                <p className="text-sm font-medium">
                  Submitted {already.status === "LATE" ? "(late)" : ""} on {new Date(already.submittedAt).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Waiting to be graded.</p>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium mb-2">Submit your work</p>
                {isPastDue && <p className="text-xs text-destructive mb-2">This assignment is past due — your submission will be marked late.</p>}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Your Answer</Label>
                    <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} placeholder="Write your answer here..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Attachment Link (optional)</Label>
                    <Input value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} placeholder="https://..." />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {!already && (
            <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Submitting..." : "Submit"}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
