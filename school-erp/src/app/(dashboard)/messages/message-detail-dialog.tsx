"use client";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { MessageItem } from "@/types";

export function MessageDetailDialog({
  open, onOpenChange, message, box,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: MessageItem | null;
  box: "inbox" | "sent";
}) {
  if (!message) return null;

  const other = box === "inbox" ? message.sender : message.recipient;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{message.subject}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {box === "inbox" ? "From" : "To"}: <span className="font-medium text-foreground">{other.name}</span> ({other.email})
            </span>
            <span>{new Date(message.createdAt).toLocaleString()}</span>
          </div>
          <div className="rounded-md border border-input bg-muted/30 p-4 text-sm whitespace-pre-wrap">
            {message.content}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
