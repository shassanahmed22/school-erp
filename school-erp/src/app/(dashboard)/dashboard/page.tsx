"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, GraduationCap, Layers, BookOpen, ArrowRight, School,
  CalendarCheck, ClipboardList, Trophy, TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth-store";
import { initials, formatDate } from "@/lib/utils";

interface ExamPreview { id: string; name: string; type: string; startDate: string; className?: string }
interface ResultPreview { id: string; studentName?: string; examName: string; className?: string; percentage: number; grade: string; position?: number | null }

interface AdminDashboard {
  role: "admin";
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalSections: number;
  recentAdmissions: { id: string; firstName: string; lastName: string; registrationNumber: string; admissionDate: string }[];
  todayAttendance: { totalMarked: number; present: number; percentage: number };
  upcomingExams: ExamPreview[];
  recentResults: ResultPreview[];
  classPerformance: { className: string; averagePercentage: number }[];
}

interface TeacherDashboard {
  role: "teacher";
  linked: boolean;
  message?: string;
  teacherName?: string;
  classTeacherOf?: { className: string; sectionName: string; studentCount: number }[];
  totalStudents?: number;
  todayAttendanceMarked?: number;
  subjects?: { subjectName: string; className: string | null }[];
  totalAssignedSubjects?: number;
  upcomingExams?: ExamPreview[];
}

interface StudentDashboard {
  role: "student";
  linked: boolean;
  message?: string;
  registrationNumber?: string;
  name?: string;
  status?: string;
  photoUrl?: string | null;
  className?: string | null;
  sectionName?: string | null;
  rollNumber?: string | null;
  classTeacherName?: string | null;
  attendancePercentage?: number;
  upcomingExams?: ExamPreview[];
  recentResults?: ResultPreview[];
}

type DashboardData = AdminDashboard | TeacherDashboard | StudentDashboard | { role: "other" };

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((j) => setData(j.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={user ? `Welcome back, ${user.firstName}!` : "Welcome back"}
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
      ) : data?.role === "admin" ? (
        <AdminDashboardView data={data} />
      ) : data?.role === "teacher" ? (
        <TeacherDashboardView data={data} />
      ) : data?.role === "student" ? (
        <StudentDashboardView data={data} />
      ) : (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No dashboard widgets configured for your role yet.</CardContent></Card>
      )}
    </div>
  );
}

function ExamList({ exams }: { exams: ExamPreview[] }) {
  if (exams.length === 0) return <p className="text-sm text-muted-foreground">No upcoming exams.</p>;
  return (
    <ul className="space-y-2">
      {exams.map((e) => (
        <li key={e.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
          <div>
            <Link href={`/exams/${e.id}`} className="font-medium hover:underline">{e.name}</Link>
            <p className="text-xs text-muted-foreground">{e.type.replace(/_/g, " ")}{e.className ? ` · ${e.className}` : ""}</p>
          </div>
          <span className="text-xs text-muted-foreground">{formatDate(e.startDate)}</span>
        </li>
      ))}
    </ul>
  );
}

function AdminDashboardView({ data }: { data: AdminDashboard }) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total Students" value={data.totalStudents} icon={<GraduationCap className="h-5 w-5 text-white" />} colorClass="bg-blue-600" />
        <StatCard label="Total Teachers" value={data.totalTeachers} icon={<Users className="h-5 w-5 text-white" />} colorClass="bg-purple-600" />
        <StatCard label="Total Classes" value={data.totalClasses} icon={<Layers className="h-5 w-5 text-white" />} colorClass="bg-amber-500" />
        <StatCard label="Total Sections" value={data.totalSections} icon={<BookOpen className="h-5 w-5 text-white" />} colorClass="bg-pink-600" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Today's Attendance"
          value={`${data.todayAttendance.present}/${data.todayAttendance.totalMarked}`}
          icon={<CalendarCheck className="h-5 w-5 text-white" />}
          colorClass="bg-green-600"
        />
        <StatCard label="Attendance Percentage" value={`${data.todayAttendance.percentage}%`} icon={<TrendingUp className="h-5 w-5 text-white" />} colorClass="bg-teal-600" />
        <StatCard label="Upcoming Exams" value={data.upcomingExams.length} icon={<ClipboardList className="h-5 w-5 text-white" />} colorClass="bg-indigo-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Admissions</CardTitle>
            <Link href="/students" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentAdmissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No admissions yet.</p>
            ) : (
              <ul className="divide-y">
                {data.recentAdmissions.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>{initials(s.firstName, s.lastName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{s.firstName} {s.lastName}</p>
                        <p className="text-xs text-muted-foreground">{s.registrationNumber}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(s.admissionDate)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quick Links</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              { href: "/students", label: "Add New Student", icon: GraduationCap },
              { href: "/attendance", label: "Mark Attendance", icon: CalendarCheck },
              { href: "/exams", label: "Create Exam", icon: ClipboardList },
              { href: "/results", label: "View Results", icon: Trophy },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="flex items-center gap-2 rounded-lg border p-3 text-sm hover:bg-accent transition-colors">
                <link.icon className="h-4 w-4 text-muted-foreground" /> {link.label}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>Upcoming Exams</CardTitle></CardHeader>
          <CardContent><ExamList exams={data.upcomingExams} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Results</CardTitle></CardHeader>
          <CardContent>
            {data.recentResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">No published results yet.</p>
            ) : (
              <ul className="space-y-2">
                {data.recentResults.map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div>
                      <p className="font-medium">{r.studentName}</p>
                      <p className="text-xs text-muted-foreground">{r.examName} · {r.className}</p>
                    </div>
                    <Badge variant="secondary">{r.percentage}% ({r.grade})</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Class Performance</CardTitle></CardHeader>
          <CardContent>
            {data.classPerformance.length === 0 ? (
              <p className="text-sm text-muted-foreground">No published results yet.</p>
            ) : (
              <ul className="space-y-2">
                {data.classPerformance.map((c) => (
                  <li key={c.className} className="flex items-center justify-between text-sm">
                    <span>{c.className}</span>
                    <div className="flex items-center gap-2 flex-1 mx-3">
                      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-blue-600" style={{ width: `${Math.min(c.averagePercentage, 100)}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right">{c.averagePercentage}%</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function TeacherDashboardView({ data }: { data: TeacherDashboard }) {
  if (!data.linked) {
    return (
      <Card><CardContent className="p-8 text-center text-muted-foreground">
        {data.message ?? "No teacher record is linked to your account yet. Contact an administrator."}
      </CardContent></Card>
    );
  }

  const sections = data.classTeacherOf ?? [];

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Class Teacher Of"
          value={sections.length > 0 ? `${sections.length} section(s)` : "Not assigned"}
          icon={<Layers className="h-5 w-5 text-white" />}
          colorClass="bg-blue-600"
        />
        <StatCard label="Assigned Subjects" value={data.totalAssignedSubjects ?? 0} icon={<BookOpen className="h-5 w-5 text-white" />} colorClass="bg-purple-600" />
        <StatCard label="Attendance Marked Today" value={data.todayAttendanceMarked ?? 0} icon={<CalendarCheck className="h-5 w-5 text-white" />} colorClass="bg-green-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {sections.length > 0 && (
          <Card>
            <CardHeader><CardTitle>My Classes</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {sections.map((s, i) => (
                <div key={i} className="rounded-lg border p-3">
                  <p className="text-sm font-semibold">{s.className} - {s.sectionName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.studentCount} student(s) enrolled</p>
                </div>
              ))}
              <Link href="/attendance" className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1">
                Mark attendance <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>My Subjects</CardTitle></CardHeader>
          <CardContent>
            {!data.subjects || data.subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subjects assigned yet.</p>
            ) : (
              <ul className="space-y-2">
                {data.subjects.map((s, i) => (
                  <li key={i} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <span className="font-medium">{s.subjectName}</span>
                    {s.className && <Badge variant="secondary">{s.className}</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Upcoming Exams</CardTitle></CardHeader>
          <CardContent><ExamList exams={data.upcomingExams ?? []} /></CardContent>
        </Card>
      </div>
    </>
  );
}

function StudentDashboardView({ data }: { data: StudentDashboard }) {
  if (!data.linked) {
    return (
      <Card><CardContent className="p-8 text-center text-muted-foreground">
        {data.message ?? "No student record is linked to your account yet. Contact the school office."}
      </CardContent></Card>
    );
  }

  return (
    <>
      <Card className="mb-6 max-w-2xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">{data.name ? initials(data.name.split(" ")[0], data.name.split(" ")[1] ?? "") : "S"}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                {data.name}
                <Badge variant={data.status === "ACTIVE" ? "success" : "secondary"}>{data.status}</Badge>
              </h3>
              <p className="text-sm text-muted-foreground">{data.registrationNumber}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><School className="h-3.5 w-3.5" /> Class</p>
              <p className="font-medium mt-1">{data.className ?? "—"} {data.sectionName ? `- ${data.sectionName}` : ""}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Roll Number</p>
              <p className="font-medium mt-1">{data.rollNumber ?? "—"}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Class Teacher</p>
              <p className="font-medium mt-1">{data.classTeacherName ?? "Not assigned"}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Attendance (this month)</p>
              <p className="font-medium mt-1">{data.attendancePercentage ?? 0}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Upcoming Exams</CardTitle></CardHeader>
          <CardContent><ExamList exams={data.upcomingExams ?? []} /></CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Results</CardTitle>
            <Link href="/results" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {!data.recentResults || data.recentResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">No published results yet.</p>
            ) : (
              <ul className="space-y-2">
                {data.recentResults.map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div>
                      <Link href={`/results/${r.id}/print`} className="font-medium hover:underline">{r.examName}</Link>
                      {r.position && <p className="text-xs text-muted-foreground">Rank #{r.position}</p>}
                    </div>
                    <Badge variant="secondary">{r.percentage}% ({r.grade})</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
