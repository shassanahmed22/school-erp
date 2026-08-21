"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import type { StudentListItem, FeeStructureItem } from "@/types";

export function IndividualAssignDialog({
  open, onOpenChange, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentListItem | null>(null);
  const [structures, setStructures] = useState<FeeStructureItem[]>([]);
  const [feeStructureId, setFeeStructureId] = useState("");
  const [discount, setDiscount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setSearch(""); setStudents([]); setSelectedStudent(null); setFeeStructureId(""); setDiscount(0);
      fetch("/api/fee-structures").then((r) => r.json()).then((j) => setStructures(j.data ?? []));
    }
  }, [open]);

  useEffect(() => {
    if (!search) { setStudents([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/students?search=${encodeURIComponent(search)}&limit=8`).then((r) => r.json()).then((j) => setStudents(j.data ?? []));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  async function handleSubmit() {
    if (!selectedStudent || !feeStructureId) {
      toast({ title: "Select a student and fee structure", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/student-fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: selectedStudent.id, feeStructureId, discount }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Failed to assign fee", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: "Fee assigned successfully", variant: "success" });
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Assign Fee to Student</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Student</Label>
            {selectedStudent ? (
              <div className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                <span>{selectedStudent.firstName} {selectedStudent.lastName} <span className="text-muted-foreground font-mono">({selectedStudent.registrationNumber})</span></span>
                <button className="text-xs text-primary" onClick={() => setSelectedStudent(null)}>Change</button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search by name or registration #..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                {students.length > 0 && (
                  <div className="border rounded-lg mt-1 max-h-40 overflow-y-auto">
                    {students.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left"
                        onClick={() => { setSelectedStudent(s); setStudents([]); setSearch(""); }}
                      >
                        <span>{s.firstName} {s.lastName}</span>
                        <span className="text-xs text-muted-foreground font-mono">{s.registrationNumber}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Fee Structure</Label>
            <Select value={feeStructureId} onValueChange={setFeeStructureId}>
              <SelectTrigger><SelectValue placeholder="Select fee structure" /></SelectTrigger>
              <SelectContent>
                {structures.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.className} — {s.feeCategoryName} — Rs. {s.amount.toLocaleString()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Additional Manual Discount (Rs., optional)</Label>
            <Input type="number" min={0} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Any active scholarships are applied automatically on top of this.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Assigning..." : "Assign Fee"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
