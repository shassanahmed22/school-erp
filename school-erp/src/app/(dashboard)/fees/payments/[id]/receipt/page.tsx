"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ReceiptData {
  id: string;
  receiptNumber: string;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber: string | null;
  remarks: string | null;
  collectedByName: string | null;
  student: { firstName: string; lastName: string; registrationNumber: string };
  feeCategoryName: string;
  className: string;
  academicYearName: string;
  finalAmount: number;
}

export default function ReceiptPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/fee-payments/${params.id}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) { setError(json.message); return; }
        setReceipt(json.data);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (error || !receipt) {
    return <Card><CardContent className="p-8 text-center text-muted-foreground">{error ?? "Receipt not found."}</CardContent></Card>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="mr-1.5 h-4 w-4" /> Print / Save PDF
        </Button>
      </div>

      <Card className="max-w-2xl mx-auto print:shadow-none print:border-none">
        <CardContent className="p-8">
          <div className="flex items-center justify-between border-b pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Bright Future School</h1>
                <p className="text-xs text-muted-foreground">Fee Payment Receipt</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Receipt No.</p>
              <p className="font-mono font-semibold">{receipt.receiptNumber}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <Info label="Student Name" value={`${receipt.student.firstName} ${receipt.student.lastName}`} />
            <Info label="Registration No." value={receipt.student.registrationNumber} mono />
            <Info label="Class" value={receipt.className} />
            <Info label="Academic Year" value={receipt.academicYearName} />
            <Info label="Fee Category" value={receipt.feeCategoryName} />
            <Info label="Payment Date" value={new Date(receipt.paymentDate).toLocaleDateString()} />
            <Info label="Payment Method" value={receipt.paymentMethod.replace(/_/g, " ")} />
            {receipt.referenceNumber && <Info label="Reference No." value={receipt.referenceNumber} mono />}
          </div>

          <div className="rounded-lg border-2 border-dashed p-6 text-center mb-6">
            <p className="text-sm text-muted-foreground">Amount Paid</p>
            <p className="text-3xl font-bold text-green-600 mt-1">Rs. {receipt.amountPaid.toLocaleString()}</p>
            <Badge variant="success" className="mt-2">Payment Confirmed</Badge>
          </div>

          {receipt.remarks && (
            <p className="text-sm text-muted-foreground mb-6"><span className="font-medium">Remarks:</span> {receipt.remarks}</p>
          )}

          <div className="grid grid-cols-2 gap-6 mt-8 pt-6 border-t text-sm text-center">
            <div>
              <div className="h-10 border-b border-dashed mb-1" />
              <p className="text-muted-foreground">{receipt.collectedByName ?? "Accounts Office"}</p>
            </div>
            <div>
              <div className="h-10 border-b border-dashed mb-1" />
              <p className="text-muted-foreground">Authorized Signature</p>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">This is a computer-generated receipt and does not require a physical stamp.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className={`font-semibold ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
