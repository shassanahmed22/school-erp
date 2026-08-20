"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Layers, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { usePermission } from "@/hooks/use-permission";
import type { ClassItem, AcademicYearItem } from "@/types";
import { ClassFormDialog } from "./class-form-dialog";
import { SectionFormDialog } from "./section-form-dialog";

export default function ClassesPage() {
  const canCreate = usePermission("classes.create");

  const [academicYears, setAcademicYears] = useState<AcademicYearItem[]>([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [classFormOpen, setClassFormOpen] = useState(false);
  const [sectionFormOpen, setSectionFormOpen] = useState(false);
  const [activeClassId, setActiveClassId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/academic-years").then((r) => r.json()).then((j) => {
      const years = j.data ?? [];
      setAcademicYears(years);
      const current = years.find((y: AcademicYearItem) => y.isCurrent) ?? years[0];
      if (current) setSelectedYear(current.id);
    });
  }, []);

  const fetchClasses = useCallback(async () => {
    if (!selectedYear) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/classes?academicYearId=${selectedYear}`);
      const json = await res.json();
      setClasses(res.ok ? json.data : []);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  return (
    <div>
      <PageHeader
        title="Classes & Sections"
        description="Organize your school into grades and sections for each academic year."
        actions={canCreate && (
          <Button onClick={() => setClassFormOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Class
          </Button>
        )}
      />

      <div className="mb-4 max-w-xs">
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger><SelectValue placeholder="Select academic year" /></SelectTrigger>
          <SelectContent>
            {academicYears.map((y) => <SelectItem key={y.id} value={y.id}>{y.name}{y.isCurrent ? " (current)" : ""}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Card className="p-4"><TableSkeleton rows={5} cols={3} /></Card>
      ) : classes.length === 0 ? (
        <Card><EmptyState title="No classes yet" description="Add your first class for this academic year." /></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {classes.map((cls) => (
            <Card key={cls.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers className="h-4 w-4 text-blue-600" /> {cls.name}
                </CardTitle>
                {canCreate && (
                  <Button
                    variant="outline" size="sm"
                    onClick={() => { setActiveClassId(cls.id); setSectionFormOpen(true); }}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Section
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {cls.sections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sections yet.</p>
                ) : (
                  cls.sections.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                      <div>
                        <p className="font-medium">Section {s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.classTeacherName ? `Class Teacher: ${s.classTeacherName}` : "No class teacher assigned"}
                        </p>
                      </div>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {s.studentCount ?? 0}/{s.capacity}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ClassFormDialog
        open={classFormOpen}
        onOpenChange={setClassFormOpen}
        academicYearId={selectedYear}
        onSaved={fetchClasses}
      />
      <SectionFormDialog
        open={sectionFormOpen}
        onOpenChange={setSectionFormOpen}
        classId={activeClassId}
        onSaved={fetchClasses}
      />
    </div>
  );
}
