"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { createRouteSchema, type CreateRouteInput } from "@/lib/validators/route.validator";
import { toast } from "@/components/ui/toaster";
import type { VehicleItem, DriverItem } from "@/types";

export function RouteFormDialog({
  open, onOpenChange, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [drivers, setDrivers] = useState<DriverItem[]>([]);

  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { errors },
  } = useForm<CreateRouteInput>({
    resolver: zodResolver(createRouteSchema),
    defaultValues: { routeName: "", startPoint: "", endPoint: "", monthlyFee: 0 },
  });

  useEffect(() => {
    if (open) {
      fetch("/api/vehicles").then((r) => r.json()).then((j) => setVehicles((j.data ?? []).filter((v: VehicleItem) => v.status === "ACTIVE")));
      fetch("/api/drivers").then((r) => r.json()).then((j) => setDrivers((j.data ?? []).filter((d: DriverItem) => d.status === "ACTIVE")));
      reset({ routeName: "", startPoint: "", endPoint: "", monthlyFee: 0, vehicleId: undefined, driverId: undefined });
    }
  }, [open, reset]);

  async function onSubmit(values: CreateRouteInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Failed to create route", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: "Route created", variant: "success" });
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Transport Route</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Route Name</Label>
            <Input placeholder="e.g. Route A - Gulshan" {...register("routeName")} />
            {errors.routeName && <p className="text-xs text-destructive">{errors.routeName.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Point</Label>
              <Input {...register("startPoint")} />
              {errors.startPoint && <p className="text-xs text-destructive">{errors.startPoint.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>End Point</Label>
              <Input {...register("endPoint")} />
              {errors.endPoint && <p className="text-xs text-destructive">{errors.endPoint.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Monthly Fee (Rs.)</Label>
            <Input type="number" min={0} step="0.01" {...register("monthlyFee")} />
            {errors.monthlyFee && <p className="text-xs text-destructive">{errors.monthlyFee.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Vehicle (optional)</Label>
              <Select value={watch("vehicleId")} onValueChange={(v) => setValue("vehicleId", v)}>
                <SelectTrigger><SelectValue placeholder="Assign vehicle" /></SelectTrigger>
                <SelectContent>{vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.vehicleNumber}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Driver (optional)</Label>
              <Select value={watch("driverId")} onValueChange={(v) => setValue("driverId", v)}>
                <SelectTrigger><SelectValue placeholder="Assign driver" /></SelectTrigger>
                <SelectContent>{drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create Route"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
