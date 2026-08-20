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
import { createDesignationSchema, type CreateDesignationInput } from "@/lib/validators/designation.validator";
import { toast } from "@/components/ui/toaster";
import type { DepartmentItem } from "@/types";

export function DesignationFormDialog({
  open, onOpenChange, departments, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: DepartmentItem[];
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { errors },
  } = useForm<CreateDesignationInput>({
    resolver: zodResolver(createDesignationSchema),
    defaultValues: { departmentId: "", title: "", description: "" },
  });

  useEffect(() => { if (open) reset({ departmentId: "", title: "", description: "" }); }, [open, reset]);

  async function onSubmit(values: CreateDesignationInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/designations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Failed to create designation", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: "Designation created", variant: "success" });
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Designation</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select value={watch("departmentId")} onValueChange={(v) => setValue("departmentId", v)}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
            {errors.departmentId && <p className="text-xs text-destructive">{errors.departmentId.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input placeholder="e.g. Subject Teacher" {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Input {...register("description")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create Designation"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
