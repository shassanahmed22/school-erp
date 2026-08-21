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
import { createBookSchema, type CreateBookInput } from "@/lib/validators/book.validator";
import { toast } from "@/components/ui/toaster";
import type { BookCategoryItem } from "@/types";

export function BookFormDialog({
  open, onOpenChange, categories, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: BookCategoryItem[];
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { errors },
  } = useForm<CreateBookInput>({
    resolver: zodResolver(createBookSchema),
    defaultValues: { title: "", author: "", quantity: 1 },
  });

  useEffect(() => { if (open) reset({ title: "", author: "", quantity: 1, categoryId: "" }); }, [open, reset]);

  async function onSubmit(values: CreateBookInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Failed to add book", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: "Book added to catalog", variant: "success" });
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add New Book</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Author</Label>
            <Input {...register("author")} />
            {errors.author && <p className="text-xs text-destructive">{errors.author.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={watch("categoryId")} onValueChange={(v) => setValue("categoryId", v)}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>ISBN (optional)</Label>
              <Input {...register("isbn")} />
            </div>
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input type="number" min={1} {...register("quantity")} />
              {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Publisher (optional)</Label>
              <Input {...register("publisher")} />
            </div>
            <div className="space-y-1.5">
              <Label>Shelf Location (optional)</Label>
              <Input placeholder="e.g. A-12" {...register("shelfLocation")} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Adding..." : "Add Book"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
