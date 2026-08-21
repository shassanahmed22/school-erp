"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Phone, Mail, MapPin, Calendar, FileText, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { usePermission } from "@/hooks/use-permission";
import { initials, formatDate } from "@/lib/utils";

const statusVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  ACTIVE: "success", INACTIVE: "secondary", GRADUATED: "secondary",
  SUSPENDED: "warning", EXPELLED: "destructive", TRANSFERRED: "secondary",
};

export default function StudentProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const canEdit = usePermission("students.edit");

  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [linkingGuardian, setLinkingGuardian] = useState<any>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<any>(null);
  const [parentEmail, setParentEmail] = useState("");
  const [linkSubmitting, setLinkSubmitting] = useState(false);

  const fetchStudent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/students/${params.id}`);
      const json = await res.json();
      if (res.ok) setStudent(json.data);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { fetchStudent(); }, [fetchStudent]);

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!student) {
    return <Card><CardContent className="p-8 text-center text-muted-foreground">Student not found.</CardContent></Card>;
  }

  const activeEnrollment = student.enrollments?.find((e: any) => e.status === "ACTIVE");

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.push("/students")}>
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Students
      </Button>

      <Card className="mb-6">
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {student.profile?.photoUrl && <AvatarImage src={student.profile.photoUrl} />}
              <AvatarFallback className="text-lg">{initials(student.firstName, student.lastName)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                {student.firstName} {student.lastName}
                <Badge variant={statusVariant[student.status]}>{student.status}</Badge>
              </h2>
              <p className="text-sm text-muted-foreground font-mono">{student.registrationNumber}</p>
              {activeEnrollment && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {activeEnrollment.section.class.name} - {activeEnrollment.section.name}
                  {activeEnrollment.rollNumber && ` · Roll #${activeEnrollment.rollNumber}`}
                </p>
              )}
            </div>
          </div>
          {canEdit && (
            <Button variant="outline" onClick={() => setStatusDialogOpen(true)}>Change Status</Button>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="personal">
        <TabsList>
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="guardians">Guardians</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <Card>
            <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow icon={Calendar} label="Date of Birth" value={student.profile?.dateOfBirth ? formatDate(student.profile.dateOfBirth) : "—"} />
              <InfoRow icon={Mail} label="Email" value={student.email ?? "—"} />
              <InfoRow icon={Phone} label="Phone" value={student.phone ?? "—"} />
              <InfoRow icon={MapPin} label="Address" value={[student.profile?.address, student.profile?.city].filter(Boolean).join(", ") || "—"} />
              <InfoRow icon={Phone} label="Emergency Contact" value={student.profile?.emergencyContactName ? `${student.profile.emergencyContactName} (${student.profile.emergencyContactPhone ?? "—"})` : "—"} />
              <InfoRow icon={FileText} label="Previous School" value={student.profile?.previousSchoolName ?? "—"} />
              <InfoRow label="Gender" value={student.profile?.gender ?? "—"} />
              <InfoRow label="Blood Group" value={student.profile?.bloodGroup ?? "—"} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guardians">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(student.guardians ?? []).map((g: any) => (
              <Card key={g.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">{g.firstName} {g.lastName}</p>
                    <Badge variant="secondary">{g.relation.replace("_", " ")}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{g.phone}</p>
                  {g.email && <p className="text-sm text-muted-foreground">{g.email}</p>}
                  {g.occupation && <p className="text-xs text-muted-foreground mt-1">Occupation: {g.occupation}</p>}

                  <div className="mt-3 pt-3 border-t">
                    {g.user ? (
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Portal account linked</p>
                          <p className="text-sm font-medium truncate">{g.user.firstName} {g.user.lastName} ({g.user.email})</p>
                        </div>
                        {canEdit && (
                          <Button variant="ghost" size="sm" onClick={() => setUnlinkTarget(g)}>Unlink</Button>
                        )}
                      </div>
                    ) : canEdit ? (
                      <Button variant="outline" size="sm" onClick={() => setLinkingGuardian(g)}>
                        Link Parent Account
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">No portal account linked</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {(student.guardians ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground col-span-2">No guardian records on file.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Documents</CardTitle>
              {canEdit && (
                <Button size="sm" onClick={() => setDocDialogOpen(true)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Document
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {(student.documents ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
              ) : (
                <ul className="divide-y">
                  {student.documents.map((d: any) => (
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

        <TabsContent value="history">
          <Card>
            <CardContent className="p-6">
              {(student.history ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No history recorded yet.</p>
              ) : (
                <ol className="relative border-l pl-6 space-y-5">
                  {student.history.map((h: any) => (
                    <li key={h.id}>
                      <p className="text-sm font-medium">{h.event.replace(/_/g, " ")}{h.fromValue && h.toValue ? `: ${h.fromValue} → ${h.toValue}` : ""}</p>
                      {h.remarks && <p className="text-sm text-muted-foreground">{h.remarks}</p>}
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(h.createdAt).toLocaleString()}</p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <StatusChangeDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        studentId={params.id}
        currentStatus={student.status}
        onSaved={fetchStudent}
      />
      <AddDocumentDialog
        open={docDialogOpen}
        onOpenChange={setDocDialogOpen}
        studentId={params.id}
        onSaved={fetchStudent}
      />

      <Dialog open={!!linkingGuardian} onOpenChange={(o) => { if (!o) { setLinkingGuardian(null); setParentEmail(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Link Parent Account</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the email of the login account for {linkingGuardian?.firstName} {linkingGuardian?.lastName}.
              The account must already exist and have the <strong>Parent</strong> role assigned.
            </p>
            <div className="space-y-1.5">
              <Label>Parent Account Email</Label>
              <Input type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} placeholder="parent@example.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setLinkingGuardian(null); setParentEmail(""); }}>Cancel</Button>
            <Button
              disabled={linkSubmitting || !parentEmail}
              onClick={async () => {
                setLinkSubmitting(true);
                try {
                  const res = await fetch(`/api/students/${params.id}/link-guardian`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ guardianId: linkingGuardian.id, parentEmail }),
                  });
                  const json = await res.json();
                  if (!res.ok) { toast({ title: "Failed to link account", description: json.message, variant: "destructive" }); return; }
                  toast({ title: "Parent account linked", variant: "success" });
                  setLinkingGuardian(null);
                  setParentEmail("");
                  fetchStudent();
                } finally {
                  setLinkSubmitting(false);
                }
              }}
            >
              {linkSubmitting ? "Linking..." : "Link Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!unlinkTarget} onOpenChange={(o) => !o && setUnlinkTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Unlink parent account?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            {unlinkTarget?.firstName} {unlinkTarget?.lastName} will no longer see this student&apos;s
            attendance, results, or fees through the parent portal until relinked.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlinkTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={linkSubmitting}
              onClick={async () => {
                setLinkSubmitting(true);
                try {
                  const res = await fetch(`/api/students/${params.id}/link-guardian`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ guardianId: unlinkTarget.id, parentEmail: null }),
                  });
                  const json = await res.json();
                  if (!res.ok) { toast({ title: "Failed to unlink account", description: json.message, variant: "destructive" }); return; }
                  toast({ title: "Parent account unlinked", variant: "success" });
                  setUnlinkTarget(null);
                  fetchStudent();
                } finally {
                  setLinkSubmitting(false);
                }
              }}
            >
              {linkSubmitting ? "Unlinking..." : "Unlink"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

function StatusChangeDialog({
  open, onOpenChange, studentId, currentStatus, onSaved,
}: { open: boolean; onOpenChange: (o: boolean) => void; studentId: string; currentStatus: string; onSaved: () => void }) {
  const [status, setStatus] = useState(currentStatus);
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { setStatus(currentStatus); }, [currentStatus, open]);

  async function handleSave() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/students/${studentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, remarks }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Failed to update status", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: "Status updated", variant: "success" });
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Change Student Status</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["ACTIVE", "INACTIVE", "GRADUATED", "SUSPENDED", "EXPELLED", "TRANSFERRED"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Remarks (optional)</Label>
            <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Reason for status change..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={submitting}>{submitting ? "Saving..." : "Update Status"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddDocumentDialog({
  open, onOpenChange, studentId, onSaved,
}: { open: boolean; onOpenChange: (o: boolean) => void; studentId: string; onSaved: () => void }) {
  const [type, setType] = useState("OTHER");
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    if (!fileName || !fileUrl) {
      toast({ title: "File name and URL are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/students/${studentId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, fileName, fileUrl }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Failed to add document", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: "Document added", variant: "success" });
      setFileName(""); setFileUrl("");
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Document</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Document Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["BIRTH_CERTIFICATE", "TRANSFER_CERTIFICATE", "REPORT_CARD", "CNIC_B_FORM", "VACCINATION_RECORD", "PHOTOGRAPH", "OTHER"].map((t) => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>File Name</Label>
            <Input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="birth_certificate.pdf" />
          </div>
          <div className="space-y-1.5">
            <Label>File URL</Label>
            <Input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://..." />
            <p className="text-xs text-muted-foreground">Upload the file to your storage provider first, then paste the resulting URL here.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={submitting}>{submitting ? "Saving..." : "Add Document"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
