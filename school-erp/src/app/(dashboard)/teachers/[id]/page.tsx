"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Phone, Mail, MapPin, GraduationCap, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { initials } from "@/lib/utils";

const statusVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  ACTIVE: "success", INACTIVE: "secondary", ON_LEAVE: "warning", RESIGNED: "secondary", TERMINATED: "destructive",
};

export default function TeacherProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [teacher, setTeacher] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchTeacher = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/teachers/${params.id}`);
      const json = await res.json();
      if (res.ok) setTeacher(json.data);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { fetchTeacher(); }, [fetchTeacher]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (!teacher) return <Card><CardContent className="p-8 text-center text-muted-foreground">Teacher not found.</CardContent></Card>;

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.push("/teachers")}>
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Teachers
      </Button>

      <Card className="mb-6">
        <CardContent className="p-6 flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {teacher.profile?.photoUrl && <AvatarImage src={teacher.profile.photoUrl} />}
            <AvatarFallback className="text-lg">{initials(teacher.firstName, teacher.lastName)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              {teacher.firstName} {teacher.lastName}
              <Badge variant={statusVariant[teacher.status]}>{teacher.status}</Badge>
            </h2>
            <p className="text-sm text-muted-foreground font-mono">{teacher.employeeCode}</p>
            {teacher.designation && <p className="text-sm text-muted-foreground mt-0.5">{teacher.designation}</p>}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="personal">
        <TabsList>
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="qualifications">Qualifications</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <Card>
            <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow icon={Mail} label="Email" value={teacher.email} />
              <InfoRow icon={Phone} label="Phone" value={teacher.phone ?? "—"} />
              <InfoRow icon={MapPin} label="Address" value={[teacher.profile?.address, teacher.profile?.city].filter(Boolean).join(", ") || "—"} />
              <InfoRow label="Experience" value={teacher.profile?.experienceYears ? `${teacher.profile.experienceYears} years` : "—"} />
              <InfoRow label="Specialization" value={teacher.profile?.specialization ?? "—"} />
              <InfoRow icon={Phone} label="Emergency Contact" value={teacher.profile?.emergencyContactName ? `${teacher.profile.emergencyContactName} (${teacher.profile.emergencyContactPhone ?? "—"})` : "—"} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qualifications">
          <Card>
            <CardContent className="p-6">
              {(teacher.qualifications ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No qualifications on file.</p>
              ) : (
                <ul className="space-y-3">
                  {teacher.qualifications.map((q: any) => (
                    <li key={q.id} className="flex items-start gap-2">
                      <GraduationCap className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">{q.degreeTitle}</p>
                        <p className="text-xs text-muted-foreground">{q.institution} · {q.yearCompleted}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Class Teacher Of</CardTitle></CardHeader>
              <CardContent>
                {teacher.classTeacherOf && teacher.classTeacherOf.length > 0 ? (
                  <ul className="space-y-1">
                    {teacher.classTeacherOf.map((ct: any) => (
                      <li key={ct.id} className="text-sm font-medium">{ct.section.class.name} - {ct.section.name}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Not assigned as a class teacher.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Subjects Taught</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {(teacher.teacherSubjects ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No subjects assigned yet.</p>
                ) : (
                  teacher.teacherSubjects.map((ts: any) => <Badge key={ts.id} variant="secondary">{ts.subject.name}</Badge>)
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardContent className="p-6">
              {(teacher.documents ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
              ) : (
                <ul className="divide-y">
                  {teacher.documents.map((d: any) => (
                    <li key={d.id} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{d.fileName}</span>
                        <Badge variant="outline">{d.type.replace(/_/g, " ")}</Badge>
                      </div>
                      <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">View</a>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon?: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
