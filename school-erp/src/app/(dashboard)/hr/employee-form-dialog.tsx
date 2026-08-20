"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { createEmployeeSchema, type CreateEmployeeInput } from "@/lib/validators/employee.validator";
import { toast } from "@/components/ui/toaster";
import type { DepartmentItem, DesignationItem } from "@/types";

export function EmployeeFormDialog({
  open, onOpenChange, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [designations, setDesignations] = useState<DesignationItem[]>([]);

  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { errors },
  } = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: { firstName: "", lastName: "", email: "", status: "ACTIVE", salary: 0 },
  });

  const departmentId = watch("departmentId");

  useEffect(() => {
    if (open) {
      fetch("/api/departments").then((r) => r.json()).then((j) => setDepartments(j.data ?? []));
      reset({ firstName: "", lastName: "", email: "", status: "ACTIVE", salary: 0, departmentId: "", designationId: "" });
    }
  }, [open, reset]);

  useEffect(() => {
    if (departmentId) {
      fetch(`/api/designations?departmentId=${departmentId}`).then((r) => r.json()).then((j) => setDesignations(j.data ?? []));
    } else {
      setDesignations([]);
    }
  }, [departmentId]);

  async function onSubmit(values: CreateEmployeeInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Failed to add employee", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: `Employee registered — ${json.data.employeeCode}`, variant: "success" });
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add New Employee</DialogTitle></DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First Name</Label>
              <Input {...register("firstName")} />
              {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Last Name</Label>
              <Input {...register("lastName")} />
              {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input {...register("phone")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={watch("departmentId")} onValueChange={(v) => { setValue("departmentId", v); setValue("designationId", ""); }}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
              {errors.departmentId && <p className="text-xs text-destructive">{errors.departmentId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Designation</Label>
              <Select value={watch("designationId")} onValueChange={(v) => setValue("designationId", v)}>
                <SelectTrigger><SelectValue placeholder={departmentId ? "Select designation" : "Select department first"} /></SelectTrigger>
                <SelectContent>{designations.map((d) => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}</SelectContent>
              </Select>
              {errors.designationId && <p className="text-xs text-destructive">{errors.designationId.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Joining Date</Label>
              <Input type="date" {...register("joiningDate")} />
            </div>
            <div className="space-y-1.5">
              <Label>Salary (Rs.)</Label>
              <Input type="number" min={0} step="0.01" {...register("salary")} />
              {errors.salary && <p className="text-xs text-destructive">{errors.salary.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Address (optional)</Label>
            <Input {...register("address")} />
          </div>

          <div className="space-y-1.5">
            <Label>Emergency Contact (optional)</Label>
            <Input {...register("emergencyContact")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Add Employee"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
