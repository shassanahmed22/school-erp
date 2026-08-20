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
import { createScholarshipSchema, type CreateScholarshipInput } from "@/lib/validators/scholarship.validator";
import { toast } from "@/components/ui/toaster";
import type { ScholarshipItem } from "@/types";

export function ScholarshipFormDialog({
  open, onOpenChange, scholarship, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scholarship: ScholarshipItem | null;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!scholarship;

  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { errors },
  } = useForm<CreateScholarshipInput>({
    resolver: zodResolver(createScholarshipSchema),
    defaultValues: { name: "", type: "PERCENTAGE", value: 0, description: "", status: "ACTIVE" },
  });

  useEffect(() => {
    if (open) {
      reset(
        scholarship
          ? { name: scholarship.name, type: scholarship.type, value: scholarship.value, description: scholarship.description ?? "", status: scholarship.status }
          : { name: "", type: "PERCENTAGE", value: 0, description: "", status: "ACTIVE" }
      );
    }
  }, [open, scholarship, reset]);

  async function onSubmit(values: CreateScholarshipInput) {
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/scholarships/${scholarship!.id}` : "/api/scholarships";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Failed to save scholarship", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: isEdit ? "Scholarship updated" : "Scholarship created", variant: "success" });
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? "Edit" : "Add"} Scholarship</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input placeholder="e.g. Merit Scholarship" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={watch("type")} onValueChange={(v) => setValue("type", v as CreateScholarshipInput["type"])} disabled={isEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                  <SelectItem value="FIXED">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Value {watch("type") === "PERCENTAGE" ? "(%)" : "(Rs.)"}</Label>
              <Input type="number" min={0.01} step="0.01" {...register("value")} />
              {errors.value && <p className="text-xs text-destructive">{errors.value.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Input {...register("description")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save Scholarship"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
