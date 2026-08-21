"use client";

import { useEffect, useState, useCallback } from "react";
import { Monitor, Smartphone, MapPin, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { toast } from "@/components/ui/toaster";

interface SessionRow {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  isCurrent: boolean;
}

function deviceLabel(userAgent: string | null) {
  if (!userAgent) return "Unknown device";
  if (/mobile|android|iphone/i.test(userAgent)) return "Mobile device";
  if (/ipad|tablet/i.test(userAgent)) return "Tablet";
  if (/chrome/i.test(userAgent)) return "Chrome browser";
  if (/firefox/i.test(userAgent)) return "Firefox browser";
  if (/safari/i.test(userAgent)) return "Safari browser";
  if (/edg/i.test(userAgent)) return "Edge browser";
  return "Desktop browser";
}

export function SessionsTab() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokeTarget, setRevokeTarget] = useState<SessionRow | null>(null);
  const [revoking, setRevoking] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/sessions");
      const json = await res.json();
      setSessions(res.ok ? json.data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  async function handleRevoke() {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      const res = await fetch(`/api/auth/sessions/${revokeTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Failed to sign out device", description: json.message, variant: "destructive" }); return; }
      toast({ title: "Device signed out", variant: "success" });
      setRevokeTarget(null);
      fetchSessions();
    } finally {
      setRevoking(false);
    }
  }

  if (loading) return <Skeleton className="h-48 rounded-lg" />;

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        These are the devices currently signed in to your account. If you don&apos;t recognize one, sign it out
        and change your password.
      </p>
      <div className="space-y-3">
        {sessions.map((s) => (
          <Card key={s.id}>
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/mobile|android|iphone/i.test(s.userAgent ?? "") ? (
                  <Smartphone className="h-5 w-5 text-muted-foreground shrink-0" />
                ) : (
                  <Monitor className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{deviceLabel(s.userAgent)}</p>
                    {s.isCurrent && <Badge variant="success">This device</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                    {s.ipAddress && (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {s.ipAddress}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Active {new Date(s.lastUsedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              {!s.isCurrent && (
                <Button variant="outline" size="sm" onClick={() => setRevokeTarget(s)}>
                  Sign Out
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(o) => !o && setRevokeTarget(null)}
        title="Sign out this device?"
        description="This device will be signed out and will need to log in again."
        onConfirm={handleRevoke}
        loading={revoking}
      />
    </div>
  );
}
