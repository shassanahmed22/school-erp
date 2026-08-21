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
import { createRoleSchema, type CreateRoleInput } from "@/lib/validators/role.validator";
import { toast } from "@/components/ui/toaster";
import type { Permission, Role } from "@/types";

export function RoleFormDialog({
  open, onOpenChange, role, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
  onSaved: () => void;
}) {
  const [grouped, setGrouped] = useState<Record<string, Permission[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!role;

  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { errors },
  } = useForm<CreateRoleInput>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: { name: "", description: "", permissionIds: [] },
  });

  useEffect(() => {
    if (open) {
      fetch("/api/permissions").then((r) => r.json()).then((j) => setGrouped(j.data?.grouped ?? {}));
    }
  }, [open]);

  useEffect(() => {
    if (role) {
      reset({ name: role.name, description: role.description ?? "", permissionIds: role.permissions.map((p) => p.id) });
    } else {
      reset({ name: "", description: "", permissionIds: [] });
    }
  }, [role, reset]);

  const selectedIds = watch("permissionIds") ?? [];

  function togglePermission(id: string) {
    const next = selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id];
    setValue("permissionIds", next);
  }

  async function onSubmit(values: CreateRoleInput) {
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/roles/${role!.id}` : "/api/roles";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Save failed", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: isEdit ? "Role updated" : "Role created", variant: "success" });
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Role" : "Add New Role"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Role Name</Label>
            <Input {...register("name")} disabled={role?.isSystem} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input {...register("description")} />
          </div>

          <div className="space-y-2">
            <Label>Permissions</Label>
            <div className="border rounded-lg divide-y max-h-72 overflow-y-auto">
              {Object.entries(grouped).map(([module, perms]) => (
                <div key={module} className="p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">{module}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {perms.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          className="rounded border-input"
                          checked={selectedIds.includes(p.id)}
                          onChange={() => togglePermission(p.id)}
                        />
                        {p.action}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save Role"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
