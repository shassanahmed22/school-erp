"use client";

import { useState } from "react";
import { Copy, Check, KeyRound, AlertTriangle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface GeneratedCredential {
  forName: string;
  role: "student" | "parent" | "teacher";
  email: string;
  temporaryPassword: string;
}

const roleLabel: Record<string, string> = { student: "Student", parent: "Parent", teacher: "Teacher" };

function CredentialRow({ cred }: { cred: GeneratedCredential }) {
  const [copied, setCopied] = useState(false);

  function copyAll() {
    navigator.clipboard.writeText(`Email: ${cred.email}\nPassword: ${cred.temporaryPassword}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{cred.forName}</p>
        <Badge variant="secondary">{roleLabel[cred.role]}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Login Email</p>
          <p className="font-mono">{cred.email}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Temporary Password</p>
          <p className="font-mono">{cred.temporaryPassword}</p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={copyAll} className="w-full">
        {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy Login Details"}
      </Button>
    </div>
  );
}

export function CredentialsDialog({
  open, onOpenChange, credentials,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credentials: GeneratedCredential[];
}) {
  if (credentials.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" /> Portal Login Created
          </DialogTitle>
          <DialogDescription>
            Share these with the people listed below. Each will be asked to set their own password the first
            time they log in.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>This password is shown <strong>only once</strong> and cannot be retrieved again after you close this — write it down or copy it now.</p>
        </div>

        <div className="space-y-3">
          {credentials.map((c, i) => <CredentialRow key={i} cred={c} />)}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
