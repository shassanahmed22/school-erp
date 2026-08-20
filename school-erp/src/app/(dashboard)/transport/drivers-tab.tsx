"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, UserCog, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { usePermission } from "@/hooks/use-permission";
import { toast } from "@/components/ui/toaster";
import type { DriverItem } from "@/types";

const statusVariant: Record<string, "success" | "warning" | "destructive"> = {
  ACTIVE: "success", ON_LEAVE: "warning", INACTIVE: "destructive",
};

export function DriversTab() {
  const canCreate = usePermission("transport.create");
  const canEdit = usePermission("transport.edit");
  const canDelete = usePermission("transport.delete");

  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DriverItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/drivers");
      const json = await res.json();
      setDrivers(res.ok ? json.data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  async function handleCreate() {
    if (!name || !phone || !licenseNumber) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, licenseNumber }),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Failed to add driver", description: json.message, variant: "destructive" }); return; }
      toast({ title: "Driver added", variant: "success" });
      setName(""); setPhone(""); setLicenseNumber("");
      setFormOpen(false);
      fetchDrivers();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    const res = await fetch(`/api/drivers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const json = await res.json();
      toast({ title: "Failed to update status", description: json.message, variant: "destructive" });
      return;
    }
    fetchDrivers();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/drivers/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Failed to delete driver", description: json.message, variant: "destructive" }); return; }
      toast({ title: "Driver deleted", variant: "success" });
      setDeleteTarget(null);
      fetchDrivers();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        {canCreate && <Button onClick={() => setFormOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> Add Driver</Button>}
      </div>

      <Card className="p-4">
        {loading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : drivers.length === 0 ? (
          <EmptyState title="No drivers yet" icon={<UserCog className="h-6 w-6 text-muted-foreground" />} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>License #</TableHead>
                <TableHead>Routes</TableHead>
                <TableHead>Status</TableHead>
                {canDelete && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>{d.phone}</TableCell>
                  <TableCell className="font-mono text-sm">{d.licenseNumber}</TableCell>
                  <TableCell><Badge variant="secondary">{d.routeCount ?? 0}</Badge></TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Select value={d.status} onValueChange={(val) => handleStatusChange(d.id, val)}>
                        <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["ACTIVE", "ON_LEAVE", "INACTIVE"].map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={statusVariant[d.status]}>{d.status.replace("_", " ")}</Badge>
                    )}
                  </TableCell>
                  {canDelete && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(d)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Driver</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>License Number</Label>
              <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting}>{submitting ? "Adding..." : "Add Driver"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete driver?"
        description="Drivers assigned to a route cannot be deleted."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
