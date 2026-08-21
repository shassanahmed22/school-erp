"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Mail, Phone, MapPin, Calendar, DollarSign, FileText, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  ACTIVE: "success", ON_LEAVE: "warning", SUSPENDED: "destructive", RESIGNED: "secondary", TERMINATED: "destructive",
};

export default function EmployeeProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const canEdit = usePermission("employees.edit");

  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [docDialogOpen, setDocDialogOpen] = useState(false);

  const fetchEmployee = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${params.id}`);
      const json = await res.json();
      if (res.ok) setEmployee(json.data);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { fetchEmployee(); }, [fetchEmployee]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (!employee) return <Card><CardContent className="p-8 text-center text-muted-foreground">Employee not found.</CardContent></Card>;

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.push("/hr")}>
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to HR & Staff
      </Button>

      <Card className="mb-6">
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">{initials(employee.firstName, employee.lastName)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                {employee.firstName} {employee.lastName}
                <Badge variant={statusVariant[employee.status]}>{employee.status.replace(/_/g, " ")}</Badge>
              </h2>
              <p className="text-sm text-muted-foreground font-mono">{employee.employeeCode}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{employee.designation.title} · {employee.department.name}</p>
            </div>
          </div>
          {canEdit && <Button variant="outline" onClick={() => setStatusDialogOpen(true)}>Change Status</Button>}
        </CardContent>
      </Card>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Employment Details</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow icon={Mail} label="Email" value={employee.email} />
              <InfoRow icon={Phone} label="Phone" value={employee.phone ?? "—"} />
              <InfoRow icon={MapPin} label="Address" value={employee.address ?? "—"} />
              <InfoRow icon={Calendar} label="Joining Date" value={formatDate(employee.joiningDate)} />
              <InfoRow icon={DollarSign} label="Salary" value={`Rs. ${Number(employee.salary).toLocaleString()}`} />
              <InfoRow icon={Phone} label="Emergency Contact" value={employee.emergencyContact ?? "—"} />
            </CardContent>
          </Card>
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
              {(employee.documents ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
              ) : (
                <ul className="divide-y">
                  {employee.documents.map((d: any) => (
                    <li key={d.id} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{d.fileName}</span>
                        <Badge variant="outline">{d.documentType.replace(/_/g, " ")}</Badge>
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

      <StatusChangeDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        employeeId={params.id}
        currentStatus={employee.status}
        onSaved={fetchEmployee}
      />
      <AddDocumentDialog
        open={docDialogOpen}
        onOpenChange={setDocDialogOpen}
        employeeId={params.id}
        onSaved={fetchEmployee}
      />
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
  open, onOpenChange, employeeId, currentStatus, onSaved,
}: { open: boolean; onOpenChange: (o: boolean) => void; employeeId: string; currentStatus: string; onSaved: () => void }) {
  const [status, setStatus] = useState(currentStatus);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { setStatus(currentStatus); }, [currentStatus, open]);

  async function handleSave() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
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
        <DialogHeader><DialogTitle>Change Employee Status</DialogTitle></DialogHeader>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["ACTIVE", "ON_LEAVE", "SUSPENDED", "RESIGNED", "TERMINATED"].map((s) => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
  open, onOpenChange, employeeId, onSaved,
}: { open: boolean; onOpenChange: (o: boolean) => void; employeeId: string; onSaved: () => void }) {
  const [documentType, setDocumentType] = useState("OTHER");
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
      const res = await fetch(`/api/employees/${employeeId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType, fileName, fileUrl }),
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
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["DEGREE", "CNIC", "RESUME", "CONTRACT", "PHOTOGRAPH", "OTHER"].map((t) => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>File Name</Label>
            <Input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="contract.pdf" />
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
