"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import type { StudentFeeItem } from "@/types";

const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "CARD", "CHEQUE", "ONLINE", "OTHER"];

export function RecordPaymentDialog({
  open, onOpenChange, onSaved, presetStudentFeeId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  presetStudentFeeId?: string;
}) {
  const [search, setSearch] = useState("");
  const [fees, setFees] = useState<StudentFeeItem[]>([]);
  const [selectedFee, setSelectedFee] = useState<StudentFeeItem | null>(null);
  const [amount, setAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setSearch(""); setFees([]); setSelectedFee(null); setAmount(0);
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod("CASH"); setReferenceNumber(""); setRemarks("");
    }
  }, [open]);

  useEffect(() => {
    if (!search) { setFees([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/student-fees?search=${encodeURIComponent(search)}&limit=8`).then((r) => r.json()).then((j) => {
        setFees((j.data ?? []).filter((f: StudentFeeItem) => f.status !== "PAID" && f.status !== "WAIVED"));
      });
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const balance = selectedFee ? selectedFee.finalAmount - selectedFee.paidAmount : 0;

  async function handleSubmit() {
    if (!selectedFee || amount <= 0) {
      toast({ title: "Select a fee record and enter a valid amount", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/fee-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentFeeId: selectedFee.id,
          amountPaid: amount,
          paymentDate,
          paymentMethod,
          referenceNumber: referenceNumber || undefined,
          remarks: remarks || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Failed to record payment", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: `Payment recorded — Receipt ${json.data.receiptNumber}`, variant: "success" });
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {!presetStudentFeeId && (
            <div className="space-y-1.5">
              <Label>Student / Fee</Label>
              {selectedFee ? (
                <div className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                  <div>
                    <p>{selectedFee.studentName} <span className="text-muted-foreground font-mono">({selectedFee.registrationNumber})</span></p>
                    <p className="text-xs text-muted-foreground">{selectedFee.feeCategoryName} · Balance: Rs. {balance.toLocaleString()}</p>
                  </div>
                  <button className="text-xs text-primary" onClick={() => setSelectedFee(null)}>Change</button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Search by student name or registration #..." value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  {fees.length > 0 && (
                    <div className="border rounded-lg mt-1 max-h-44 overflow-y-auto">
                      {fees.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left"
                          onClick={() => { setSelectedFee(f); setAmount(f.finalAmount - f.paidAmount); setFees([]); setSearch(""); }}
                        >
                          <span>{f.studentName} — {f.feeCategoryName}</span>
                          <Badge variant="secondary">Rs. {(f.finalAmount - f.paidAmount).toLocaleString()} due</Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount (Rs.)</Label>
              <Input type="number" min={0.01} step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
              {selectedFee && <p className="text-xs text-muted-foreground">Balance due: Rs. {balance.toLocaleString()}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Payment Date</Label>
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Reference Number (optional)</Label>
            <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="Cheque # / transaction ID" />
          </div>

          <div className="space-y-1.5">
            <Label>Remarks (optional)</Label>
            <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Recording..." : "Record Payment"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
