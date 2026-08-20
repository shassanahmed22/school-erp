"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePermission } from "@/hooks/use-permission";
import { toast } from "@/components/ui/toaster";
import { initials } from "@/lib/utils";
import type { TeacherListItem } from "@/types";
import { TeacherFormDialog } from "./teacher-form-dialog";

const statusVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  ACTIVE: "success", INACTIVE: "secondary", ON_LEAVE: "warning", RESIGNED: "secondary", TERMINATED: "destructive",
};

export default function TeachersPage() {
  const canCreate = usePermission("teachers.create");
  const canDelete = usePermission("teachers.delete");

  const [teachers, setTeachers] = useState<TeacherListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeacherListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/teachers?${params}`);
      const json = await res.json();
      setTeachers(res.ok ? json.data : []);
      setTotalPages(json.pagination?.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const t = setTimeout(fetchTeachers, 300);
    return () => clearTimeout(t);
  }, [fetchTeachers]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/teachers/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        toast({ title: "Failed to remove teacher", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: "Teacher removed", variant: "success" });
      setDeleteTarget(null);
      fetchTeachers();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Teacher Management"
        description="Registration, qualifications, and subject/class assignments."
        actions={canCreate && <Button onClick={() => setFormOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> Add Teacher</Button>}
      />

      <Card className="p-4">
        <div className="relative max-w-sm mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search teachers..." className="pl-9" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
        </div>

        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : teachers.length === 0 ? (
          <EmptyState title="No teachers found" description="Try adjusting your search, or register a new teacher." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Employee Code</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Class Teacher Of</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Link href={`/teachers/${t.id}`} className="flex items-center gap-3 hover:underline">
                        <Avatar className="h-9 w-9">
                          {t.photoUrl && <AvatarImage src={t.photoUrl} />}
                          <AvatarFallback>{initials(t.firstName, t.lastName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{t.firstName} {t.lastName}</p>
                          <p className="text-xs text-muted-foreground">{t.email}</p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{t.employeeCode}</TableCell>
                    <TableCell>{t.designation ?? "—"}</TableCell>
                    <TableCell>{t.sectionName ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell><Badge variant={statusVariant[t.status]}>{t.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild><Link href={`/teachers/${t.id}`}>View</Link></Button>
                      {canDelete && (
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(t)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <TeacherFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={fetchTeachers} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove teacher?"
        description={`This will soft-delete ${deleteTarget?.firstName} ${deleteTarget?.lastName}'s record.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
