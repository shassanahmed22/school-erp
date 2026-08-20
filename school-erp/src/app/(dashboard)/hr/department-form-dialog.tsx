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
import { createDepartmentSchema, type CreateDepartmentInput } from "@/lib/validators/department.validator";
import { toast } from "@/components/ui/toaster";
import type { DepartmentItem } from "@/types";

export function DepartmentFormDialog({
  open, onOpenChange, department, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department: DepartmentItem | null;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!department;

  const {
    register, handleSubmit, reset,
    formState: { errors },
  } = useForm<CreateDepartmentInput>({
    resolver: zodResolver(createDepartmentSchema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (open) reset(department ? { name: department.name, description: department.description ?? "" } : { name: "", description: "" });
  }, [open, department, reset]);

  async function onSubmit(values: CreateDepartmentInput) {
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/departments/${department!.id}` : "/api/departments";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Failed to save department", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: isEdit ? "Department updated" : "Department created", variant: "success" });
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? "Edit" : "Add"} Department</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Department Name</Label>
            <Input placeholder="e.g. Academics" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Input {...register("description")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save Department"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
