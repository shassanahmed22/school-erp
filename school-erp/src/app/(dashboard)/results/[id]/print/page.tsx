"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";

interface ResultCardData {
  id: string;
  student: { firstName: string; lastName: string; registrationNumber: string };
  exam: { name: string; type: string; className: string; academicYearName: string };
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  grade: string;
  gpa: number | null;
  position: number | null;
  status: string;
  subjects: { subjectName: string; totalMarks: number; obtainedMarks: number; grade: string; isAbsent: boolean }[];
}

export default function ResultCardPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [result, setResult] = useState<ResultCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/results/${params.id}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) { setError(json.message); return; }
        setResult(json.data);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;
  if (error || !result) {
    return <Card><CardContent className="p-8 text-center text-muted-foreground">{error ?? "Result not found."}</CardContent></Card>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="mr-1.5 h-4 w-4" /> Print / Save PDF
        </Button>
      </div>

      <Card className="max-w-3xl mx-auto print:shadow-none print:border-none">
        <CardContent className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Bright Future School</h1>
                <p className="text-xs text-muted-foreground">Student Result Card</p>
              </div>
            </div>
            <Badge variant={result.status === "PUBLISHED" ? "success" : "warning"}>{result.status}</Badge>
          </div>

          {/* Student + Exam Info */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <p className="text-muted-foreground">Student Name</p>
              <p className="font-semibold">{result.student.firstName} {result.student.lastName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Registration No.</p>
              <p className="font-semibold font-mono">{result.student.registrationNumber}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Class</p>
              <p className="font-semibold">{result.exam.className}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Academic Year</p>
              <p className="font-semibold">{result.exam.academicYearName}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground">Examination</p>
              <p className="font-semibold">{result.exam.name} ({result.exam.type.replace(/_/g, " ")})</p>
            </div>
          </div>

          {/* Subject Marks Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Total Marks</TableHead>
                <TableHead>Obtained</TableHead>
                <TableHead>Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.subjects.map((s, i) => (
                <TableRow key={i}>
                  <TableCell>{s.subjectName}</TableCell>
                  <TableCell>{s.totalMarks}</TableCell>
                  <TableCell>{s.isAbsent ? <span className="text-destructive">Absent</span> : s.obtainedMarks}</TableCell>
                  <TableCell><Badge variant="outline">{s.grade}</Badge></TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold bg-muted/40">
                <TableCell>Total</TableCell>
                <TableCell>{result.totalMarks}</TableCell>
                <TableCell>{result.obtainedMarks}</TableCell>
                <TableCell><Badge>{result.grade}</Badge></TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {/* Summary */}
          <div className="grid grid-cols-4 gap-3 mt-6">
            <SummaryBox label="Percentage" value={`${result.percentage}%`} />
            <SummaryBox label="Grade" value={result.grade} />
            <SummaryBox label="GPA" value={result.gpa != null ? String(result.gpa) : "—"} />
            <SummaryBox label="Position" value={result.position ? `#${result.position}` : "—"} />
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-6 mt-12 pt-6 border-t text-sm text-center">
            <div>
              <div className="h-10 border-b border-dashed mb-1" />
              <p className="text-muted-foreground">Class Teacher</p>
            </div>
            <div>
              <div className="h-10 border-b border-dashed mb-1" />
              <p className="text-muted-foreground">Principal</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold mt-1">{value}</p>
    </div>
  );
}
