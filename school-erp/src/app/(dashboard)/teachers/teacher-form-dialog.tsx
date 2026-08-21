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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { createTeacherSchema, type CreateTeacherInput } from "@/lib/validators/teacher.validator";
import { toast } from "@/components/ui/toaster";
import { CredentialsDialog, type GeneratedCredential } from "@/components/shared/credentials-dialog";
import type { SubjectItem } from "@/types";

export function TeacherFormDialog({
  open, onOpenChange, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [credentials, setCredentials] = useState<GeneratedCredential[]>([]);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);

  const {
    register, handleSubmit, reset, control, watch, setValue,
    formState: { errors },
  } = useForm<CreateTeacherInput>({
    resolver: zodResolver(createTeacherSchema),
    defaultValues: {
      firstName: "", lastName: "", email: "", designation: "", status: "ACTIVE",
      qualifications: [{ degreeTitle: "", institution: "", yearCompleted: new Date().getFullYear() }],
      subjectIds: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "qualifications" });
  const selectedSubjectIds = watch("subjectIds") ?? [];

  useEffect(() => {
    if (open) {
      fetch("/api/subjects").then((r) => r.json()).then((j) => setSubjects(j.data ?? []));
      reset({
        firstName: "", lastName: "", email: "", designation: "", status: "ACTIVE",
        qualifications: [{ degreeTitle: "", institution: "", yearCompleted: new Date().getFullYear() }],
        subjectIds: [],
      });
    }
  }, [open, reset]);

  function toggleSubject(id: string) {
    const next = selectedSubjectIds.includes(id) ? selectedSubjectIds.filter((i) => i !== id) : [...selectedSubjectIds, id];
    setValue("subjectIds", next);
  }

  async function onSubmit(values: CreateTeacherInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Registration failed", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: `Teacher registered — ${json.data.employeeCode}`, variant: "success" });
      onOpenChange(false);
      onSaved();
      if (json.data.credentials?.length > 0) {
        setCredentials(json.data.credentials);
        setCredentialsOpen(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
        <DialogHeader><DialogTitle>Register New Teacher</DialogTitle></DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Tabs defaultValue="personal">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="qualifications">Qualifications</TabsTrigger>
              <TabsTrigger value="subjects">Subjects</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4">
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
                  <Label>Designation</Label>
                  <Input placeholder="Senior Teacher, HOD, etc." {...register("designation")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Experience (years)</Label>
                  <Input type="number" min={0} {...register("experienceYears")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Specialization</Label>
                <Input placeholder="e.g. Mathematics, Science" {...register("specialization")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Emergency Contact Name</Label>
                  <Input {...register("emergencyContactName")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Emergency Contact Phone</Label>
                  <Input {...register("emergencyContactPhone")} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="qualifications" className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-lg border p-3 space-y-3 relative">
                  {fields.length > 1 && (
                    <button type="button" className="absolute right-2 top-2 text-destructive" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Degree Title</Label>
                      <Input {...register(`qualifications.${index}.degreeTitle`)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Year Completed</Label>
                      <Input type="number" {...register(`qualifications.${index}.yearCompleted`)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Institution</Label>
                    <Input {...register(`qualifications.${index}.institution`)} />
                  </div>
                </div>
              ))}
              <Button
                type="button" variant="outline" size="sm"
                onClick={() => append({ degreeTitle: "", institution: "", yearCompleted: new Date().getFullYear() })}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Qualification
              </Button>
            </TabsContent>

            <TabsContent value="subjects" className="space-y-2">
              <p className="text-sm text-muted-foreground mb-2">Select the subjects this teacher will teach.</p>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {subjects.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm rounded-lg border p-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-input"
                      checked={selectedSubjectIds.includes(s.id)}
                      onChange={() => toggleSubject(s.id)}
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Registering..." : "Register Teacher"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <CredentialsDialog open={credentialsOpen} onOpenChange={setCredentialsOpen} credentials={credentials} />
    </>
  );
}
