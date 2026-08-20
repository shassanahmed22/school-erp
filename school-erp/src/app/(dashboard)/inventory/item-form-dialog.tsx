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
import { createInventoryItemSchema, type CreateInventoryItemInput } from "@/lib/validators/inventory-item.validator";
import { toast } from "@/components/ui/toaster";
import type { InventoryCategoryItem, InventoryItemRow } from "@/types";

const UNITS = ["PCS", "BOX", "PACKET", "KG", "LITRE", "SET", "REAM", "OTHER"];

export function ItemFormDialog({
  open, onOpenChange, categories, editingItem, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: InventoryCategoryItem[];
  editingItem: InventoryItemRow | null;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!editingItem;
  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { errors },
  } = useForm<CreateInventoryItemInput>({
    resolver: zodResolver(createInventoryItemSchema),
    defaultValues: { name: "", unit: "PCS", quantity: 0, reorderLevel: 0, unitPrice: 0 },
  });

  useEffect(() => {
    if (!open) return;
    if (editingItem) {
      reset({
        name: editingItem.name,
        sku: editingItem.sku ?? undefined,
        categoryId: editingItem.categoryId,
        unit: editingItem.unit,
        quantity: editingItem.quantity,
        reorderLevel: editingItem.reorderLevel,
        unitPrice: editingItem.unitPrice,
        supplier: editingItem.supplier ?? undefined,
        location: editingItem.location ?? undefined,
        status: editingItem.status,
      });
    } else {
      reset({ name: "", sku: undefined, categoryId: "", unit: "PCS", quantity: 0, reorderLevel: 0, unitPrice: 0, supplier: undefined, location: undefined, status: "ACTIVE" });
    }
  }, [open, editingItem, reset]);

  async function onSubmit(values: CreateInventoryItemInput) {
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/inventory-items/${editingItem!.id}` : "/api/inventory-items";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: isEdit ? "Failed to update item" : "Failed to add item", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: isEdit ? "Item updated" : "Item added", variant: "success" });
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Inventory Item" : "Add Inventory Item"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Item Name</Label>
            <Input {...register("name")} placeholder="e.g. Whiteboard Markers (Box of 12)" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>SKU (optional)</Label>
              <Input {...register("sku")} placeholder="e.g. STA-0001" />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={watch("categoryId")} onValueChange={(v) => setValue("categoryId", v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
              {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Select value={watch("unit")} onValueChange={(v) => setValue("unit", v as CreateInventoryItemInput["unit"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{isEdit ? "Quantity" : "Opening Quantity"}</Label>
              <Input type="number" min={0} {...register("quantity")} disabled={isEdit} />
              {isEdit && <p className="text-[11px] text-muted-foreground">Use Stock Transactions to change quantity</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Reorder Level</Label>
              <Input type="number" min={0} {...register("reorderLevel")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Unit Price (Rs.)</Label>
              <Input type="number" min={0} step="0.01" {...register("unitPrice")} />
              {errors.unitPrice && <p className="text-xs text-destructive">{errors.unitPrice.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Supplier (optional)</Label>
              <Input {...register("supplier")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Storage Location (optional)</Label>
              <Input {...register("location")} placeholder="e.g. Main Store" />
            </div>
            {isEdit && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={watch("status")} onValueChange={(v) => setValue("status", v as CreateInventoryItemInput["status"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                    <SelectItem value="DISCONTINUED">DISCONTINUED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : isEdit ? "Save Changes" : "Add Item"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
