"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { loginSchema, type LoginInput } from "@/lib/validators/auth.validator";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "@/components/ui/toaster";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((s) => s.setUser);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  async function onSubmit(values: LoginInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Login failed", description: json.message, variant: "destructive" });
        return;
      }
      setUser(json.data.user);
      toast({ title: "Welcome back!", variant: "success" });
      router.push(searchParams.get("redirect") || "/dashboard");
    } catch {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-lg font-semibold mb-1">Sign In</h2>
        <p className="text-sm text-muted-foreground mb-6">Enter your credentials to access the dashboard.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="admin@brightfuture.edu" {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" {...register("password")} />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowPassword((s) => !s)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch checked={watch("rememberMe")} onCheckedChange={(v) => setValue("rememberMe", v)} id="remember" />
              <Label htmlFor="remember" className="font-normal text-sm">Remember Me</Label>
            </div>
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
              Forgot Password?
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Default admin: admin@brightfuture.edu / ChangeMe@123
        </p>
      </CardContent>
    </Card>
  );
}
