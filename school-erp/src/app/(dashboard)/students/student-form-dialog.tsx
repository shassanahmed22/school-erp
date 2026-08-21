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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { createStudentSchema, type CreateStudentInput } from "@/lib/validators/student.validator";
import { toast } from "@/components/ui/toaster";
import { CredentialsDialog, type GeneratedCredential } from "@/components/shared/credentials-dialog";
import type { ClassItem, AcademicYearItem } from "@/types";

export function StudentFormDialog({
  open, onOpenChange, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [credentials, setCredentials] = useState<GeneratedCredential[]>([]);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");

  const {
    register, handleSubmit, reset, control, setValue, watch,
    formState: { errors },
  } = useForm<CreateStudentInput>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      firstName: "", lastName: "", email: "", phone: "",
      gender: "MALE", status: "ACTIVE",
      guardians: [{ relation: "FATHER", firstName: "", lastName: "", phone: "", isPrimary: true }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "guardians" });

  useEffect(() => {
    if (open) {
      fetch("/api/classes").then((r) => r.json()).then((j) => setClasses(j.data ?? []));
      fetch("/api/academic-years").then((r) => r.json()).then((j) => {
        const years = j.data ?? [];
        setAcademicYears(years);
        const current = years.find((y: AcademicYearItem) => y.isCurrent);
        if (current) setValue("academicYearId", current.id);
      });
      reset({
        firstName: "", lastName: "", email: "", phone: "",
        gender: "MALE", status: "ACTIVE",
        guardians: [{ relation: "FATHER", firstName: "", lastName: "", phone: "", isPrimary: true }],
      });
      setSelectedClassId("");
    }
  }, [open, reset, setValue]);

  async function onSubmit(values: CreateStudentInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Admission failed", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: `Student admitted — ${json.data.registrationNumber}`, variant: "success" });
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

  const sections = classes.find((c) => c.id === selectedClassId)?.sections ?? [];

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Student Admission</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Tabs defaultValue="personal">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="guardian">Guardian</TabsTrigger>
              <TabsTrigger value="academic">Academic</TabsTrigger>
            </TabsList>

            {/* ---------- Personal ---------- */}
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
                  <Label>Date of Birth</Label>
                  <Input type="date" {...register("dateOfBirth")} />
                  {errors.dateOfBirth && <p className="text-xs text-destructive">{errors.dateOfBirth.message as string}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <Select value={watch("gender")} onValueChange={(v) => setValue("gender", v as CreateStudentInput["gender"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Email (optional)</Label>
                  <Input type="email" {...register("email")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone (optional)</Label>
                  <Input {...register("phone")} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input {...register("address")} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input {...register("city")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Photo URL (optional)</Label>
                  <Input placeholder="https://..." {...register("photoUrl")} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div className="space-y-1.5 pt-2">
                  <Label>Previous School</Label>
                  <Input {...register("previousSchoolName")} />
                </div>
                <div className="space-y-1.5 pt-2">
                  <Label>Previous Grade</Label>
                  <Input {...register("previousGrade")} />
                </div>
              </div>
            </TabsContent>

            {/* ---------- Guardian ---------- */}
            <TabsContent value="guardian" className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-lg border p-3 space-y-3 relative">
                  {fields.length > 1 && (
                    <button
                      type="button"
                      className="absolute right-2 top-2 text-destructive"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Relation</Label>
                      <Select
                        value={watch(`guardians.${index}.relation`)}
                        onValueChange={(v) => setValue(`guardians.${index}.relation`, v as never)}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["FATHER", "MOTHER", "BROTHER", "SISTER", "UNCLE", "AUNT", "GRANDFATHER", "GRANDMOTHER", "LEGAL_GUARDIAN", "OTHER"].map((r) => (
                            <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Phone</Label>
                      <Input {...register(`guardians.${index}.phone`)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>First Name</Label>
                      <Input {...register(`guardians.${index}.firstName`)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Last Name</Label>
                      <Input {...register(`guardians.${index}.lastName`)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Occupation</Label>
                      <Input {...register(`guardians.${index}.occupation`)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>CNIC</Label>
                      <Input {...register(`guardians.${index}.cnic`)} />
                    </div>
                  </div>
                </div>
              ))}
              {errors.guardians && <p className="text-xs text-destructive">{errors.guardians.message as string}</p>}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ relation: "MOTHER", firstName: "", lastName: "", phone: "", isPrimary: false })}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Another Guardian
              </Button>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div className="space-y-1.5 pt-2">
                  <Label>Emergency Contact Name</Label>
                  <Input {...register("emergencyContactName")} />
                </div>
                <div className="space-y-1.5 pt-2">
                  <Label>Emergency Contact Phone</Label>
                  <Input {...register("emergencyContactPhone")} />
                </div>
              </div>
            </TabsContent>

            {/* ---------- Academic ---------- */}
            <TabsContent value="academic" className="space-y-4">
              <div className="space-y-1.5">
                <Label>Academic Year</Label>
                <Select value={watch("academicYearId")} onValueChange={(v) => setValue("academicYearId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select academic year" /></SelectTrigger>
                  <SelectContent>
                    {academicYears.map((y) => <SelectItem key={y.id} value={y.id}>{y.name}{y.isCurrent ? " (current)" : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Class</Label>
                  <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Section</Label>
                  <Select value={watch("sectionId")} onValueChange={(v) => setValue("sectionId", v)}>
                    <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                    <SelectContent>
                      {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Roll Number (optional)</Label>
                <Input {...register("rollNumber")} />
              </div>

              <p className="text-xs text-muted-foreground">
                Enrollment is optional at admission time — you can enroll the student into a
                section later from the student&apos;s profile page.
              </p>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Admitting..." : "Admit Student"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <CredentialsDialog open={credentialsOpen} onOpenChange={setCredentialsOpen} credentials={credentials} />
    </>
  );
}
