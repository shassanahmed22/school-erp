"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, MapPin, PenLine, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { usePermission } from "@/hooks/use-permission";
import { toast } from "@/components/ui/toaster";
import { formatDate } from "@/lib/utils";
import { ScheduleFormDialog } from "./schedule-form-dialog";

const statusVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  DRAFT: "secondary", SCHEDULED: "warning", ONGOING: "warning",
  COMPLETED: "secondary", RESULT_PUBLISHED: "success", CANCELLED: "destructive",
};

export default function ExamDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const canEdit = usePermission("exams.edit");

  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [activeExamSubjectId, setActiveExamSubjectId] = useState<string | null>(null);

  const fetchExam = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/exams/${params.id}`);
      const json = await res.json();
      if (res.ok) setExam(json.data);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { fetchExam(); }, [fetchExam]);

  async function handleStatusChange(status: string) {
    const res = await fetch(`/api/exams/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast({ title: "Failed to update status", description: json.message, variant: "destructive" });
      return;
    }
    toast({ title: "Exam status updated", variant: "success" });
    fetchExam();
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (!exam) return <Card><CardContent className="p-8 text-center text-muted-foreground">Exam not found.</CardContent></Card>;

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.push("/exams")}>
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Exams
      </Button>

      <Card className="mb-6">
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              {exam.name}
              <Badge variant={statusVariant[exam.status]}>{exam.status.replace(/_/g, " ")}</Badge>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {exam.class.name} · {exam.academicYear.name} · {formatDate(exam.startDate)} – {formatDate(exam.endDate)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <Select value={exam.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["DRAFT", "SCHEDULED", "ONGOING", "COMPLETED", "RESULT_PUBLISHED", "CANCELLED"].map((s) => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button asChild variant="outline">
              <Link href={`/results?examId=${exam.id}`}>View Results</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Subjects & Schedule</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {exam.examSubjects.map((es: any) => (
            <div key={es.id} className="rounded-lg border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-medium">{es.subject.name}</p>
                <p className="text-xs text-muted-foreground">Total: {es.totalMarks} · Passing: {es.passingMarks}</p>
                {es.schedule ? (
                  <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(es.schedule.examDate)}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {es.schedule.startTime}–{es.schedule.endTime}</span>
                    {es.schedule.room && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {es.schedule.room}</span>}
                  </div>
                ) : (
                  <p className="text-xs text-amber-600 mt-2">Not scheduled yet</p>
                )}
              </div>
              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    variant="outline" size="sm"
                    onClick={() => { setActiveExamSubjectId(es.id); setScheduleDialogOpen(true); }}
                  >
                    {es.schedule ? <><PenLine className="mr-1.5 h-3.5 w-3.5" /> Edit Schedule</> : <><Plus className="mr-1.5 h-3.5 w-3.5" /> Schedule</>}
                  </Button>
                )}
                <Button size="sm" asChild>
                  <Link href={`/exams/${exam.id}/marks?examSubjectId=${es.id}`}>Enter Marks</Link>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <ScheduleFormDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        examSubjectId={activeExamSubjectId}
        existing={exam.examSubjects.find((es: any) => es.id === activeExamSubjectId)?.schedule ?? null}
        onSaved={fetchExam}
      />
    </div>
  );
}
