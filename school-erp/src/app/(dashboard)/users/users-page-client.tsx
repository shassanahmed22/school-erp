"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserFormDialog } from "./user-form-dialog";
import { toast } from "@/components/ui/toaster";
import { initials, formatDate } from "@/lib/utils";
import type { UserListItem } from "@/types";

const statusVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  ACTIVE: "success",
  PENDING: "warning",
  SUSPENDED: "destructive",
  INACTIVE: "secondary",
};

export function UsersPageClient() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: "1", limit: "20" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/users?${params}`);
      const json = await res.json();
      setUsers(res.ok ? json.data : []);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300);
    return () => clearTimeout(t);
  }, [fetchUsers]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        toast({ title: "Failed to delete user", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: "User deleted", variant: "success" });
      setDeleteTarget(null);
      fetchUsers();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="User Management"
        description="Create and manage all system users and their role assignments."
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" /> Add User
          </Button>
        }
      />

      <Card className="p-4">
        <div className="relative max-w-sm mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search users..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : users.length === 0 ? (
          <EmptyState title="No users found" description="Try adjusting your search or add a new user." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role(s)</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>{initials(u.firstName, u.lastName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => <Badge key={r.id} variant="secondary">{r.name}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell>{u.phone ?? "—"}</TableCell>
                  <TableCell><Badge variant={statusVariant[u.status]}>{u.status}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(u); setFormOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(u)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editing}
        onSaved={fetchUsers}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete user?"
        description={`This will deactivate ${deleteTarget?.firstName} ${deleteTarget?.lastName}'s account. This can be reversed by an administrator.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
