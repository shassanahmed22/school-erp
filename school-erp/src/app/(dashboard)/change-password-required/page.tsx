"use client";

import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/shared/change-password-form";

export default function ChangePasswordRequiredPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            <CardTitle>Update Your Password</CardTitle>
          </div>
          <CardDescription>
            For security, you must set a new password before continuing. Enter the temporary password
            your administrator gave you as the current password, then choose a new one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm onSuccess={() => router.push("/dashboard")} />
        </CardContent>
      </Card>
    </div>
  );
}
