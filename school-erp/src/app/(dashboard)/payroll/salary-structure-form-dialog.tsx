"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import type { SalaryStructureItem, EmployeeListItem } from "@/types";

export function SalaryStructureFormDialog({
  open, onOpenChange, structure, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  structure: SalaryStructureItem | null;
  onSaved: () => void;
}) {
  const isEdit = !!structure;
  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeListItem | null>(null);
  const [basicSalary, setBasicSalary] = useState(0);
  const [allowances, setAllowances] = useState(0);
  const [deductions, setDeductions] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setSearch(""); setEmployees([]);
      setSelectedEmployee(structure ? { id: structure.employeeId, employeeCode: structure.employeeCode, firstName: structure.employeeName.split(" ")[0], lastName: structure.employeeName.split(" ").slice(1).join(" ") } as EmployeeListItem : null);
      setBasicSalary(structure?.basicSalary ?? 0);
      setAllowances(structure?.allowances ?? 0);
      setDeductions(structure?.deductions ?? 0);
    }
  }, [open, structure]);

  useEffect(() => {
    if (isEdit || !search) { setEmployees([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/employees?search=${encodeURIComponent(search)}&limit=8`).then((r) => r.json()).then((j) => setEmployees(j.data ?? []));
    }, 300);
    return () => clearTimeout(t);
  }, [search, isEdit]);

  async function handleSubmit() {
    if (!selectedEmployee) {
      toast({ title: "Select an employee", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/salary-structures/${structure!.id}` : "/api/salary-structures";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? { basicSalary, allowances, deductions }
            : { employeeId: selectedEmployee.id, basicSalary, allowances, deductions }
        ),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Failed to save salary structure", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: "Salary structure saved", variant: "success" });
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? "Edit" : "Set"} Salary Structure</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Employee</Label>
            {selectedEmployee ? (
              <div className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                <span>{selectedEmployee.firstName} {selectedEmployee.lastName} <span className="text-muted-foreground font-mono">({selectedEmployee.employeeCode})</span></span>
                {!isEdit && <button className="text-xs text-primary" onClick={() => setSelectedEmployee(null)}>Change</button>}
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search employee..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                {employees.length > 0 && (
                  <div className="border rounded-lg mt-1 max-h-40 overflow-y-auto">
                    {employees.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left"
                        onClick={() => { setSelectedEmployee(e); setEmployees([]); setSearch(""); }}
                      >
                        <span>{e.firstName} {e.lastName}</span>
                        <span className="text-xs text-muted-foreground font-mono">{e.employeeCode}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Basic Salary (Rs.)</Label>
            <Input type="number" min={0} step="0.01" value={basicSalary} onChange={(e) => setBasicSalary(Number(e.target.value))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Allowances (Rs.)</Label>
              <Input type="number" min={0} step="0.01" value={allowances} onChange={(e) => setAllowances(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Deductions (Rs.)</Label>
              <Input type="number" min={0} step="0.01" value={deductions} onChange={(e) => setDeductions(Number(e.target.value))} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
