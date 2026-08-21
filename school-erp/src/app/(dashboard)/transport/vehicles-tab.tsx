"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Bus, Trash2 } from "lucide-react";
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
import type { VehicleItem } from "@/types";

const statusVariant: Record<string, "success" | "warning" | "destructive"> = {
  ACTIVE: "success", MAINTENANCE: "warning", INACTIVE: "destructive",
};

export function VehiclesTab() {
  const canCreate = usePermission("transport.create");
  const canEdit = usePermission("transport.edit");
  const canDelete = usePermission("transport.delete");

  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [model, setModel] = useState("");
  const [capacity, setCapacity] = useState(30);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VehicleItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vehicles");
      const json = await res.json();
      setVehicles(res.ok ? json.data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  async function handleCreate() {
    if (!vehicleNumber || capacity < 1) {
      toast({ title: "Vehicle number and capacity are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleNumber, model: model || undefined, capacity }),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Failed to add vehicle", description: json.message, variant: "destructive" }); return; }
      toast({ title: "Vehicle added", variant: "success" });
      setVehicleNumber(""); setModel(""); setCapacity(30);
      setFormOpen(false);
      fetchVehicles();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    const res = await fetch(`/api/vehicles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const json = await res.json();
      toast({ title: "Failed to update status", description: json.message, variant: "destructive" });
      return;
    }
    fetchVehicles();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/vehicles/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Failed to delete vehicle", description: json.message, variant: "destructive" }); return; }
      toast({ title: "Vehicle deleted", variant: "success" });
      setDeleteTarget(null);
      fetchVehicles();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        {canCreate && <Button onClick={() => setFormOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> Add Vehicle</Button>}
      </div>

      <Card className="p-4">
        {loading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : vehicles.length === 0 ? (
          <EmptyState title="No vehicles yet" icon={<Bus className="h-6 w-6 text-muted-foreground" />} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Routes</TableHead>
                <TableHead>Status</TableHead>
                {canDelete && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono font-medium">{v.vehicleNumber}</TableCell>
                  <TableCell>{v.model ?? "—"}</TableCell>
                  <TableCell>{v.capacity}</TableCell>
                  <TableCell><Badge variant="secondary">{v.routeCount ?? 0}</Badge></TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Select value={v.status} onValueChange={(val) => handleStatusChange(v.id, val)}>
                        <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["ACTIVE", "MAINTENANCE", "INACTIVE"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={statusVariant[v.status]}>{v.status}</Badge>
                    )}
                  </TableCell>
                  {canDelete && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(v)}>
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
          <DialogHeader><DialogTitle>Add Vehicle</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Vehicle Number</Label>
              <Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="e.g. LEA-4521" />
            </div>
            <div className="space-y-1.5">
              <Label>Model (optional)</Label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. Toyota Coaster" />
            </div>
            <div className="space-y-1.5">
              <Label>Capacity</Label>
              <Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting}>{submitting ? "Adding..." : "Add Vehicle"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete vehicle?"
        description="Vehicles assigned to a route cannot be deleted."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
