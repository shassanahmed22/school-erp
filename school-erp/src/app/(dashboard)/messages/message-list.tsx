"use client";

import { useEffect, useState, useCallback } from "react";
import { Mail, MailOpen, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { toast } from "@/components/ui/toaster";
import { MessageDetailDialog } from "./message-detail-dialog";
import type { MessageItem } from "@/types";

export function MessageList({ box, refreshKey, onChanged }: { box: "inbox" | "sent"; refreshKey: number; onChanged: () => void }) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MessageItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MessageItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/messages?box=${box}`);
      const json = await res.json();
      setMessages(res.ok ? json.data : []);
    } finally {
      setLoading(false);
    }
  }, [box]);

  useEffect(() => { fetchMessages(); }, [fetchMessages, refreshKey]);

  async function openMessage(m: MessageItem) {
    setSelected(m);
    setDetailOpen(true);
    if (box === "inbox" && m.status === "UNREAD") {
      await fetch(`/api/messages/${m.id}`);
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, status: "READ" } : x)));
      onChanged();
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/messages/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Failed to delete message", description: json.message, variant: "destructive" }); return; }
      toast({ title: "Message deleted", variant: "success" });
      setDeleteTarget(null);
      fetchMessages();
      onChanged();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <Card className="p-2">
        {loading ? (
          <div className="p-4"><TableSkeleton rows={5} cols={1} /></div>
        ) : messages.length === 0 ? (
          <EmptyState
            title={box === "inbox" ? "No messages in your inbox" : "No sent messages"}
            icon={<Mail className="h-6 w-6 text-muted-foreground" />}
          />
        ) : (
          <div className="divide-y">
            {messages.map((m) => {
              const other = box === "inbox" ? m.sender : m.recipient;
              const isUnread = box === "inbox" && m.status === "UNREAD";
              return (
                <div
                  key={m.id}
                  onClick={() => openMessage(m)}
                  className="flex items-center justify-between gap-3 px-3 py-3 cursor-pointer hover:bg-muted/50 rounded-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isUnread ? <Mail className="h-4 w-4 shrink-0 text-blue-600" /> : <MailOpen className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    <div className="min-w-0">
                      <p className={`text-sm truncate ${isUnread ? "font-semibold" : "font-medium"}`}>{m.subject}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {box === "inbox" ? "From" : "To"}: {other.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {isUnread && <Badge variant="default">New</Badge>}
                    <span className="text-xs text-muted-foreground hidden sm:inline">{new Date(m.createdAt).toLocaleDateString()}</span>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteTarget(m); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <MessageDetailDialog open={detailOpen} onOpenChange={setDetailOpen} message={selected} box={box} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete message?"
        description="This message will be removed from your view."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
