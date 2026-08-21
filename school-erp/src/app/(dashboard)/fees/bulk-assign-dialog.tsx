"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import type { ClassItem, FeeStructureItem } from "@/types";

export function BulkAssignDialog({
  open, onOpenChange, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [structures, setStructures] = useState<FeeStructureItem[]>([]);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("ALL");
  const [feeStructureId, setFeeStructureId] = useState("");
  const [applyScholarships, setApplyScholarships] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetch("/api/classes").then((r) => r.json()).then((j) => setClasses(j.data ?? []));
      setClassId(""); setSectionId("ALL"); setFeeStructureId("");
    }
  }, [open]);

  useEffect(() => {
    if (classId) {
      fetch(`/api/fee-structures?classId=${classId}`).then((r) => r.json()).then((j) => setStructures(j.data ?? []));
    } else {
      setStructures([]);
    }
  }, [classId]);

  const sections = classes.find((c) => c.id === classId)?.sections ?? [];

  async function handleSubmit() {
    if (!classId || !feeStructureId) {
      toast({ title: "Select a class and fee structure", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/student-fees/bulk-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          feeStructureId,
          applyScholarships,
          ...(sectionId !== "ALL" && { sectionId }),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Bulk assignment failed", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: json.message, variant: "success" });
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Bulk Assign Fee</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Section (optional — leave as &quot;All&quot; for the entire class)</Label>
            <Select value={sectionId} onValueChange={setSectionId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Sections</SelectItem>
                {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Fee Structure</Label>
            <Select value={feeStructureId} onValueChange={setFeeStructureId}>
              <SelectTrigger><SelectValue placeholder={classId ? "Select fee structure" : "Select a class first"} /></SelectTrigger>
              <SelectContent>
                {structures.map((s) => <SelectItem key={s.id} value={s.id}>{s.feeCategoryName} — Rs. {s.amount.toLocaleString()}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={applyScholarships} onCheckedChange={setApplyScholarships} id="apply-scholarships" />
            <Label htmlFor="apply-scholarships" className="font-normal">Automatically apply active scholarships as discounts</Label>
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
