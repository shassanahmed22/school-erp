"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { toast } from "@/components/ui/toaster";

interface RosterEntry {
  studentId: string;
  firstName: string;
  lastName: string;
  registrationNumber: string;
  rollNumber: string | null;
  obtainedMarks: number;
  isAbsent: boolean;
}

function MarksEntryContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const examSubjectId = searchParams.get("examSubjectId");

  const [subjectName, setSubjectName] = useState("");
  const [totalMarks, setTotalMarks] = useState(100);
  const [passingMarks, setPassingMarks] = useState(40);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchRoster = useCallback(async () => {
    if (!examSubjectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/results/roster?examSubjectId=${examSubjectId}`);
      const json = await res.json();
      if (res.ok) {
        setSubjectName(json.data.subjectName);
        setTotalMarks(json.data.totalMarks);
        setPassingMarks(json.data.passingMarks);
        setRoster(json.data.roster);
      }
    } finally {
      setLoading(false);
    }
  }, [examSubjectId]);

  useEffect(() => { fetchRoster(); }, [fetchRoster]);

  function updateMarks(studentId: string, obtainedMarks: number) {
    setRoster((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, obtainedMarks, isAbsent: false } : r)));
  }

  function toggleAbsent(studentId: string) {
    setRoster((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, isAbsent: !r.isAbsent, obtainedMarks: 0 } : r)));
  }

  async function handleSave() {
    if (!examSubjectId) return;

    const invalid = roster.find((r) => !r.isAbsent && (r.obtainedMarks < 0 || r.obtainedMarks > totalMarks));
    if (invalid) {
      toast({ title: `Marks must be between 0 and ${totalMarks}`, variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/results/compute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: params.id,
          examSubjectId,
          entries: roster.map((r) => ({ studentId: r.studentId, obtainedMarks: r.obtainedMarks, isAbsent: r.isAbsent })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Failed to save marks", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: "Marks saved and results recomputed", variant: "success" });
    } finally {
      setSaving(false);
    }
  }

  if (!examSubjectId) {
    return <EmptyState title="No subject selected" description="Open this page from the exam's subject list." />;
  }

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.push(`/exams/${params.id}`)}>
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Exam
      </Button>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">{subjectName || "Marks Entry"}</h2>
            <p className="text-sm text-muted-foreground">Total Marks: {totalMarks} · Passing Marks: {passingMarks}</p>
          </div>
          <Button onClick={handleSave} disabled={saving || loading}>
            <Save className="mr-1.5 h-4 w-4" /> {saving ? "Saving..." : "Save Marks"}
          </Button>
        </div>

        {loading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : roster.length === 0 ? (
          <EmptyState title="No students enrolled" description="This class has no active enrollments yet." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Roll #</TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="w-40">Obtained Marks</TableHead>
                <TableHead>Absent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.map((r) => (
                <TableRow key={r.studentId}>
                  <TableCell>{r.rollNumber ?? "—"}</TableCell>
                  <TableCell>
                    <p className="font-medium">{r.firstName} {r.lastName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{r.registrationNumber}</p>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      max={totalMarks}
                      disabled={r.isAbsent}
                      value={r.obtainedMarks}
                      onChange={(e) => updateMarks(r.studentId, Number(e.target.value))}
                      className="h-9 w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <button type="button" onClick={() => toggleAbsent(r.studentId)}>
                      <Badge variant={r.isAbsent ? "destructive" : "outline"}>{r.isAbsent ? "Absent" : "Mark Absent"}</Badge>
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

export default function MarksEntryPage() {
  return (
    <Suspense fallback={null}>
      <MarksEntryContent />
    </Suspense>
  );
}
