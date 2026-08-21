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
import { createClassSchema, type CreateClassInput } from "@/lib/validators/academic.validator";
import { toast } from "@/components/ui/toaster";

export function ClassFormDialog({
  open, onOpenChange, academicYearId, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  academicYearId: string;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register, handleSubmit, reset, setValue,
    formState: { errors },
  } = useForm<CreateClassInput>({
    resolver: zodResolver(createClassSchema),
    defaultValues: { name: "", numericGrade: 1, academicYearId },
  });

  useEffect(() => {
    if (open) reset({ name: "", numericGrade: 1, academicYearId });
  }, [open, academicYearId, reset]);

  useEffect(() => { setValue("academicYearId", academicYearId); }, [academicYearId, setValue]);

  async function onSubmit(values: CreateClassInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Failed to create class", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: "Class created", variant: "success" });
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add New Class</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Class Name</Label>
            <Input placeholder="e.g. Grade 6" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Numeric Grade (for sorting)</Label>
            <Input type="number" min={0} max={20} {...register("numericGrade")} />
            {errors.numericGrade && <p className="text-xs text-destructive">{errors.numericGrade.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create Class"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
