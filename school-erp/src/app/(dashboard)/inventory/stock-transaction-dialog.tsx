"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import type { InventoryItemRow, InventoryTransactionType } from "@/types";

const TYPE_LABELS: Record<InventoryTransactionType, string> = {
  STOCK_IN: "Stock In (add to inventory)",
  STOCK_OUT: "Stock Out (issue / consume)",
  ADJUSTMENT: "Adjustment (correction)",
};

export function StockTransactionDialog({
  open, onOpenChange, item, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItemRow | null;
  onSaved: () => void;
}) {
  const [type, setType] = useState<InventoryTransactionType>("STOCK_IN");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) { setType("STOCK_IN"); setQuantity(1); setReason(""); }
  }, [open, item]);

  async function handleSubmit() {
    if (!item) return;
    if (quantity < 1) { toast({ title: "Quantity must be at least 1", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, type, quantity, reason: reason || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Failed to record transaction", description: json.message, variant: "destructive" }); return; }
      toast({ title: "Stock updated", variant: "success" });
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Stock — {item.name}</DialogTitle>
          <DialogDescription>Current quantity: {item.quantity} {item.unit.toLowerCase()}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Transaction Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as InventoryTransactionType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_LABELS) as InventoryTransactionType[]).map((t) => (
                  <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Quantity</Label>
            <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Reason / Note (optional)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="e.g. Issued to Grade 3 classroom" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Saving..." : "Record Transaction"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
