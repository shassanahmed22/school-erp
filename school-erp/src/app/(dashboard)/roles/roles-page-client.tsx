"use client";

import { useEffect, useState } from "react";
import { Plus, ShieldCheck, Lock, Trash2, Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import type { Role } from "@/types";
import { RoleFormDialog } from "./role-form-dialog";

export function RolesPageClient() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchRoles() {
    setLoading(true);
    try {
      const res = await fetch("/api/roles");
      const json = await res.json();
      setRoles(res.ok ? json.data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchRoles(); }, []);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/roles/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Failed to delete role", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: "Role deleted", variant: "success" });
      setDeleteTarget(null);
      fetchRoles();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Role Management"
        description="Define roles and assign granular permissions to each."
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Role
          </Button>
        }
      />

      {loading ? (
        <Card className="p-4"><TableSkeleton rows={5} cols={4} /></Card>
      ) : roles.length === 0 ? (
        <Card><EmptyState title="No roles found" /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <Card key={role.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                    <ShieldCheck className="h-4.5 w-4.5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold flex items-center gap-1.5">
                      {role.name}
                      {role.isSystem && <Lock className="h-3 w-3 text-muted-foreground" />}
                    </p>
                    <p className="text-xs text-muted-foreground">{role.userCount ?? 0} user(s)</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(role); setFormOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {!role.isSystem && (
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(role)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{role.description || "No description"}</p>
              <div className="flex flex-wrap gap-1">
                {role.permissions.slice(0, 4).map((p) => <Badge key={p.id} variant="secondary">{p.name}</Badge>)}
                {role.permissions.length > 4 && <Badge variant="outline">+{role.permissions.length - 4} more</Badge>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <RoleFormDialog open={formOpen} onOpenChange={setFormOpen} role={editing} onSaved={fetchRoles} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete role?"
        description={`Users assigned to "${deleteTarget?.name}" will lose the permissions granted by it.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
