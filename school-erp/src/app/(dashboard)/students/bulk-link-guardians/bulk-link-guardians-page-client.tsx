"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LinkIcon, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";

interface RowResult {
  registrationNumber: string;
  guardianPhone: string;
  parentEmail: string;
  status: "linked" | "skipped";
  reason?: string;
}

const PLACEHOLDER = `REG-2024-001, 03001234567, ayesha.parent@example.com
REG-2024-002, 03007654321, bilal.parent@example.com`;

function parseRows(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [registrationNumber, guardianPhone, parentEmail] = line.split(",").map((s) => s.trim());
      return { registrationNumber, guardianPhone, parentEmail };
    })
    .filter((r) => r.registrationNumber && r.guardianPhone && r.parentEmail);
}

export function BulkLinkGuardiansPageClient() {
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<RowResult[] | null>(null);

  const parsedCount = parseRows(raw).length;

  async function handleSubmit() {
    const rows = parseRows(raw);
    if (rows.length === 0) {
      toast({ title: "No valid rows found", description: "Each line needs: registration number, guardian phone, parent email", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    setResults(null);
    try {
      const res = await fetch("/api/students/bulk-link-guardians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Bulk link failed", description: json.message, variant: "destructive" });
        return;
      }
      setResults(json.data.results);
      toast({ title: `Linked ${json.data.linked} of ${rows.length}`, variant: json.data.skipped > 0 ? "default" : "success" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Bulk-Link Parent Accounts"
        description="Link many guardian records to their parent portal accounts at once — useful when onboarding an existing school's data."
        actions={
          <Button variant="outline" onClick={() => router.push("/students")}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Students
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Paste Rows</CardTitle>
            <CardDescription>
              One row per line: <code className="text-xs">registration number, guardian phone, parent email</code>.
              The guardian phone must exactly match what&apos;s on the student&apos;s profile, and the parent email
              must belong to an existing account with the Parent role.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={12}
              placeholder={PLACEHOLDER}
              className="font-mono text-sm"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{parsedCount} row(s) detected</p>
              <Button onClick={handleSubmit} disabled={submitting || parsedCount === 0}>
                <LinkIcon className="mr-1.5 h-4 w-4" />
                {submitting ? "Linking..." : `Link ${parsedCount || ""} Account(s)`}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Results</CardTitle>
            <CardDescription>Shows here after you submit.</CardDescription>
          </CardHeader>
          <CardContent>
            {!results ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No results yet.</p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto">
                {results.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-md border p-2.5">
                    {r.status === "linked" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{r.registrationNumber} → {r.parentEmail}</p>
                      {r.status === "linked" ? (
                        <Badge variant="success">Linked</Badge>
                      ) : (
                        <p className="text-xs text-muted-foreground">{r.reason}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
