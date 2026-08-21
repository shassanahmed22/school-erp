"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { createExamSchema, type CreateExamInput } from "@/lib/validators/exam.validator";
import { toast } from "@/components/ui/toaster";
import type { ClassItem, SubjectItem, AcademicYearItem } from "@/types";

const EXAM_TYPES = ["QUIZ", "MID_TERM", "FINAL_TERM", "MONTHLY_TEST", "ASSIGNMENT", "OTHER"];

export function ExamFormDialog({
  open, onOpenChange, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearItem[]>([]);

  const {
    register, handleSubmit, reset, control, watch, setValue,
    formState: { errors },
  } = useForm<CreateExamInput>({
    resolver: zodResolver(createExamSchema),
    defaultValues: { name: "", type: "MID_TERM", status: "DRAFT", subjects: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "subjects" });

  useEffect(() => {
    if (open) {
      fetch("/api/classes").then((r) => r.json()).then((j) => setClasses(j.data ?? []));
      fetch("/api/subjects").then((r) => r.json()).then((j) => setSubjects(j.data ?? []));
      fetch("/api/academic-years").then((r) => r.json()).then((j) => {
        const years = j.data ?? [];
        setAcademicYears(years);
        const current = years.find((y: AcademicYearItem) => y.isCurrent);
        if (current) setValue("academicYearId", current.id);
      });
      reset({ name: "", type: "MID_TERM", status: "DRAFT", subjects: [] });
    }
  }, [open, reset, setValue]);

  async function onSubmit(values: CreateExamInput) {
    if (values.subjects.length === 0) {
      toast({ title: "Add at least one subject", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Failed to create exam", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: "Exam created", variant: "success" });
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-xl">
        <DialogHeader><DialogTitle>Create New Exam</DialogTitle></DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Exam Name</Label>
            <Input placeholder="e.g. Mid Term Examination 2026" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Exam Type</Label>
              <Select value={watch("type")} onValueChange={(v) => setValue("type", v as CreateExamInput["type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXAM_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Academic Year</Label>
              <Select value={watch("academicYearId")} onValueChange={(v) => setValue("academicYearId", v)}>
                <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent>
                  {academicYears.map((y) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Class</Label>
            <Select value={watch("classId")} onValueChange={(v) => setValue("classId", v)}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            {errors.classId && <p className="text-xs text-destructive">{errors.classId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" {...register("startDate")} />
              {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message as string}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" {...register("endDate")} />
              {errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message as string}</p>}
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between pt-2">
              <Label>Subjects & Marks</Label>
              <Button
                type="button" variant="outline" size="sm"
                onClick={() => append({ subjectId: "", totalMarks: 100, passingMarks: 40 })}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Subject
              </Button>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end rounded-lg border p-2.5">
                <div className="space-y-1">
                  <Label className="text-xs">Subject</Label>
                  <Select
                    value={watch(`subjects.${index}.subjectId`)}
                    onValueChange={(v) => setValue(`subjects.${index}.subjectId`, v)}
                  >
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 w-20">
                  <Label className="text-xs">Total</Label>
                  <Input className="h-9" type="number" {...register(`subjects.${index}.totalMarks`)} />
                </div>
                <div className="space-y-1 w-20">
                  <Label className="text-xs">Passing</Label>
                  <Input className="h-9" type="number" {...register(`subjects.${index}.passingMarks`)} />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            {errors.subjects && <p className="text-xs text-destructive">{errors.subjects.message as string}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create Exam"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
