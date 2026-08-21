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
import type { AnnouncementAudience, AnnouncementItem } from "@/types";

const AUDIENCES: { value: AnnouncementAudience; label: string }[] = [
  { value: "ALL", label: "Everyone" },
  { value: "STUDENTS", label: "Students only" },
  { value: "PARENTS", label: "Parents only" },
  { value: "TEACHERS", label: "Teachers only" },
  { value: "STAFF", label: "Staff only" },
];

export function AnnouncementFormDialog({
  open, onOpenChange, editingAnnouncement, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAnnouncement: AnnouncementItem | null;
  onSaved: () => void;
}) {
  const isEdit = !!editingAnnouncement;
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState<AnnouncementAudience>("ALL");
  const [isPinned, setIsPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingAnnouncement) {
      setTitle(editingAnnouncement.title);
      setContent(editingAnnouncement.content);
      setAudience(editingAnnouncement.audience);
      setIsPinned(editingAnnouncement.isPinned);
      setExpiresAt(editingAnnouncement.expiresAt ? editingAnnouncement.expiresAt.slice(0, 10) : "");
    } else {
      setTitle(""); setContent(""); setAudience("ALL"); setIsPinned(false); setExpiresAt("");
    }
  }, [open, editingAnnouncement]);

  async function handleSubmit() {
    if (!title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    if (!content.trim()) { toast({ title: "Content is required", variant: "destructive" }); return; }

    setSubmitting(true);
    try {
      const url = isEdit ? `/api/announcements/${editingAnnouncement!.id}` : "/api/announcements";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          audience,
          isPinned,
          expiresAt: expiresAt || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: isEdit ? "Failed to update announcement" : "Failed to publish announcement", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: isEdit ? "Announcement updated" : "Announcement published", variant: "success" });
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Announcement" : "Publish Announcement"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Parent-Teacher Meeting Schedule" />
          </div>
          <div className="space-y-1.5">
            <Label>Content</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} placeholder="Write the announcement details..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Audience</Label>
              <Select value={audience} onValueChange={(v) => setAudience(v as AnnouncementAudience)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIENCES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Expires On (optional)</Label>
              <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border border-input px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Pin to top</p>
              <p className="text-xs text-muted-foreground">Pinned announcements always appear first</p>
            </div>
            <Switch checked={isPinned} onCheckedChange={setIsPinned} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Saving..." : isEdit ? "Save Changes" : "Publish"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
