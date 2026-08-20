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
import { createSectionSchema, type CreateSectionInput } from "@/lib/validators/academic.validator";
import { toast } from "@/components/ui/toaster";
import type { TeacherListItem } from "@/types";

export function SectionFormDialog({
  open, onOpenChange, classId, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string | null;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [teachers, setTeachers] = useState<TeacherListItem[]>([]);

  const {
    register, handleSubmit, reset, setValue, watch,
    formState: { errors },
  } = useForm<CreateSectionInput>({
    resolver: zodResolver(createSectionSchema),
    defaultValues: { name: "", classId: classId ?? "", capacity: 40 },
  });

  useEffect(() => {
    if (open) {
      fetch("/api/teachers?limit=100").then((r) => r.json()).then((j) => setTeachers(j.data ?? []));
      reset({ name: "", classId: classId ?? "", capacity: 40 });
    }
  }, [open, classId, reset]);

  async function onSubmit(values: CreateSectionInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Failed to create section", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: "Section created", variant: "success" });
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Section</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Section Name</Label>
              <Input placeholder="e.g. A" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Capacity</Label>
              <Input type="number" min={1} max={200} {...register("capacity")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Class Teacher (optional)</Label>
            <Select value={watch("classTeacherId")} onValueChange={(v) => setValue("classTeacherId", v)}>
              <SelectTrigger><SelectValue placeholder="Assign a class teacher" /></SelectTrigger>
              <SelectContent>
                {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting || !classId}>{submitting ? "Creating..." : "Create Section"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
