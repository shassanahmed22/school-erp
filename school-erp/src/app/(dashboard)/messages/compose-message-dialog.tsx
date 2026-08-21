"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import type { MessageDirectoryUser } from "@/types";

export function ComposeMessageDialog({
  open, onOpenChange, onSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent: () => void;
}) {
  const [recipientQuery, setRecipientQuery] = useState("");
  const [directory, setDirectory] = useState<MessageDirectoryUser[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<MessageDirectoryUser | null>(null);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setRecipientQuery(""); setDirectory([]); setSelectedRecipient(null); setSubject(""); setContent("");
    }
  }, [open]);

  useEffect(() => {
    if (!open || selectedRecipient) return;
    const timeout = setTimeout(async () => {
      const params = new URLSearchParams();
      if (recipientQuery) params.set("search", recipientQuery);
      const res = await fetch(`/api/messages/directory?${params.toString()}`);
      const json = await res.json();
      setDirectory(res.ok ? json.data : []);
    }, 250);
    return () => clearTimeout(timeout);
  }, [recipientQuery, open, selectedRecipient]);

  async function handleSend() {
    if (!selectedRecipient) { toast({ title: "Please choose a recipient", variant: "destructive" }); return; }
    if (!subject.trim()) { toast({ title: "Subject is required", variant: "destructive" }); return; }
    if (!content.trim()) { toast({ title: "Message cannot be empty", variant: "destructive" }); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: selectedRecipient.id, subject, content }),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Failed to send message", description: json.message, variant: "destructive" }); return; }
      toast({ title: "Message sent", variant: "success" });
      onOpenChange(false);
      onSent();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Compose Message</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>To</Label>
            {selectedRecipient ? (
              <div className="flex items-center justify-between rounded-md border border-input px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{selectedRecipient.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedRecipient.email}</p>
                </div>
                <button onClick={() => setSelectedRecipient(null)}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-8" placeholder="Search by name or email..." value={recipientQuery} onChange={(e) => setRecipientQuery(e.target.value)} />
                </div>
                {directory.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-md border border-input divide-y">
                    {directory.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setSelectedRecipient(u)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted"
                      >
                        <div>
                          <p className="text-sm font-medium">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                        {u.roles[0] && <Badge variant="secondary">{u.roles[0]}</Badge>}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Message subject" />
          </div>

          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} placeholder="Write your message..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSend} disabled={submitting}>{submitting ? "Sending..." : "Send Message"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
