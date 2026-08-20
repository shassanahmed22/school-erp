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
import { createFeeStructureSchema, type CreateFeeStructureInput } from "@/lib/validators/fee-structure.validator";
import { toast } from "@/components/ui/toaster";
import type { ClassItem, AcademicYearItem, FeeCategoryItem } from "@/types";

export function StructureFormDialog({
  open, onOpenChange, classes, academicYears, categories, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: ClassItem[];
  academicYears: AcademicYearItem[];
  categories: FeeCategoryItem[];
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { errors },
  } = useForm<CreateFeeStructureInput>({
    resolver: zodResolver(createFeeStructureSchema),
    defaultValues: { status: "ACTIVE" },
  });

  useEffect(() => {
    if (open) {
      const current = academicYears.find((y) => y.isCurrent);
      reset({ classId: "", academicYearId: current?.id ?? "", feeCategoryId: "", amount: 0, status: "ACTIVE" });
    }
  }, [open, academicYears, reset]);

  async function onSubmit(values: CreateFeeStructureInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/fee-structures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Failed to create fee structure", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: "Fee structure created", variant: "success" });
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Fee Structure</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Fee Category</Label>
            <Select value={watch("feeCategoryId")} onValueChange={(v) => setValue("feeCategoryId", v)}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            {errors.feeCategoryId && <p className="text-xs text-destructive">{errors.feeCategoryId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Class</Label>
              <Select value={watch("classId")} onValueChange={(v) => setValue("classId", v)}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
              {errors.classId && <p className="text-xs text-destructive">{errors.classId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Academic Year</Label>
              <Select value={watch("academicYearId")} onValueChange={(v) => setValue("academicYearId", v)}>
                <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent>{academicYears.map((y) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount (Rs.)</Label>
              <Input type="number" min={0} step="0.01" {...register("amount")} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" {...register("dueDate")} />
              {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate.message as string}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create Fee Structure"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
