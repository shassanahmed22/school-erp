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
import type { StudentListItem, RouteItem } from "@/types";

export function AssignTransportDialog({
  open, onOpenChange, routes, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routes: RouteItem[];
  onSaved: () => void;
}) {
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentListItem | null>(null);
  const [routeId, setRouteId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) { setSearch(""); setStudents([]); setSelectedStudent(null); setRouteId(""); }
  }, [open]);

  useEffect(() => {
    if (!search) { setStudents([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/students?search=${encodeURIComponent(search)}&limit=8`).then((r) => r.json()).then((j) => setStudents(j.data ?? []));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  async function handleSubmit() {
    if (!selectedStudent || !routeId) {
      toast({ title: "Select a student and a route", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/student-transport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: selectedStudent.id, routeId }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Failed to assign student", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: "Student assigned to route", variant: "success" });
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Assign Student to Route</DialogTitle></DialogHeader>
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
                  <Input className="pl-9" placeholder="Search student..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
            <Label>Route</Label>
            <Select value={routeId} onValueChange={setRouteId}>
              <SelectTrigger><SelectValue placeholder="Select a route" /></SelectTrigger>
              <SelectContent>
                {routes.map((r) => <SelectItem key={r.id} value={r.id}>{r.routeName} — Rs. {r.monthlyFee.toLocaleString()}/mo</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Assigning..." : "Assign to Route"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
