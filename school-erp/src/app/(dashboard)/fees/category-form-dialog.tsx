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
import { createFeeCategorySchema, type CreateFeeCategoryInput } from "@/lib/validators/fee-category.validator";
import { toast } from "@/components/ui/toaster";
import type { FeeCategoryItem } from "@/types";

export function CategoryFormDialog({
  open, onOpenChange, category, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: FeeCategoryItem | null;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!category;

  const {
    register, handleSubmit, reset,
    formState: { errors },
  } = useForm<CreateFeeCategoryInput>({
    resolver: zodResolver(createFeeCategorySchema),
    defaultValues: { name: "", description: "", status: "ACTIVE" },
  });

  useEffect(() => {
    if (open) {
      reset(category ? { name: category.name, description: category.description ?? "", status: category.status } : { name: "", description: "", status: "ACTIVE" });
    }
  }, [open, category, reset]);

  async function onSubmit(values: CreateFeeCategoryInput) {
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/fee-categories/${category!.id}` : "/api/fee-categories";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Failed to save category", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: isEdit ? "Category updated" : "Category created", variant: "success" });
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? "Edit" : "Add"} Fee Category</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Category Name</Label>
            <Input placeholder="e.g. Tuition Fee" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Input {...register("description")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save Category"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
