"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validators/auth.validator";

export function ChangePasswordForm({ onSuccess }: { onSuccess?: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register, handleSubmit, reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });

  async function onSubmit(values: ChangePasswordInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Failed to change password", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: "Password changed successfully", variant: "success" });
      reset();
      onSuccess?.();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4 max-w-md" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-1.5">
        <Label>Current Password</Label>
        <Input type="password" {...register("currentPassword")} />
        {errors.currentPassword && <p className="text-xs text-destructive">{errors.currentPassword.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>New Password</Label>
        <Input type="password" {...register("newPassword")} />
        {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Confirm New Password</Label>
        <Input type="password" {...register("confirmPassword")} />
        {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
      </div>
      <Button type="submit" disabled={submitting}>{submitting ? "Updating..." : "Update Password"}</Button>
    </form>
  );
}
