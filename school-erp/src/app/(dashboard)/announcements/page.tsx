"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Megaphone, Pin, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { usePermission } from "@/hooks/use-permission";
import { toast } from "@/components/ui/toaster";
import { AnnouncementFormDialog } from "./announcement-form-dialog";
import type { AnnouncementItem } from "@/types";

const audienceLabel: Record<string, string> = {
  ALL: "Everyone",
  STUDENTS: "Students",
  PARENTS: "Parents",
  TEACHERS: "Teachers",
  STAFF: "Staff",
};

export default function AnnouncementsPage() {
  const canCreate = usePermission("announcements.create");
  const canEdit = usePermission("announcements.edit");
  const canDelete = usePermission("announcements.delete");

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AnnouncementItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/announcements");
      const json = await res.json();
      setAnnouncements(res.ok ? json.data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/announcements/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Failed to delete announcement", description: json.message, variant: "destructive" }); return; }
      toast({ title: "Announcement deleted", variant: "success" });
      setDeleteTarget(null);
      fetchAnnouncements();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Announcements"
        description="School-wide announcements and notices for students, parents, teachers, and staff."
        actions={canCreate ? <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="mr-1.5 h-4 w-4" /> Publish Announcement</Button> : undefined}
      />

      {loading ? (
        <Card className="p-4"><TableSkeleton rows={4} cols={1} /></Card>
      ) : announcements.length === 0 ? (
        <Card><EmptyState title="No announcements yet" icon={<Megaphone className="h-6 w-6 text-muted-foreground" />} /></Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {a.isPinned && <Pin className="h-3.5 w-3.5 text-amber-500" />}
                      <p className="font-semibold">{a.title}</p>
                      <Badge variant="secondary">{audienceLabel[a.audience] ?? a.audience}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      By {a.publishedBy} · {new Date(a.createdAt).toLocaleDateString()}
                      {a.expiresAt && ` · Expires ${new Date(a.expiresAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  {(canEdit || canDelete) && (
                    <div className="flex gap-1 shrink-0">
                      {canEdit && (
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(a); setFormOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(a)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AnnouncementFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editingAnnouncement={editing}
        onSaved={fetchAnnouncements}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete announcement?"
        description="This will remove the announcement for everyone."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
