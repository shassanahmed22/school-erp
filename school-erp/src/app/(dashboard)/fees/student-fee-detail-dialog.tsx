"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

interface DetailData {
  id: string;
  student: { firstName: string; lastName: string; registrationNumber: string };
  feeCategory: string;
  className: string;
  academicYearName: string;
  amount: number;
  discount: number;
  finalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  dueDate: string;
  status: string;
  payments: { id: string; receiptNumber: string; amountPaid: number; paymentDate: string; paymentMethod: string }[];
}

const statusVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  PENDING: "warning", PARTIALLY_PAID: "secondary", PAID: "success", OVERDUE: "destructive", WAIVED: "secondary",
};

export function StudentFeeDetailDialog({
  open, onOpenChange, studentFeeId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentFeeId: string | null;
}) {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && studentFeeId) {
      setLoading(true);
      fetch(`/api/student-fees/${studentFeeId}`)
        .then((r) => r.json())
        .then((j) => setData(j.data))
        .finally(() => setLoading(false));
    }
  }, [open, studentFeeId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Fee Details</DialogTitle></DialogHeader>

        {loading ? (
          <div className="space-y-2"><Skeleton className="h-6 w-full" /><Skeleton className="h-32 w-full" /></div>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">Unable to load fee details.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{data.student.firstName} {data.student.lastName}</p>
                <p className="text-xs text-muted-foreground font-mono">{data.student.registrationNumber}</p>
              </div>
              <Badge variant={statusVariant[data.status]}>{data.status.replace(/_/g, " ")}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Category" value={data.feeCategory} />
              <Info label="Class" value={data.className} />
              <Info label="Total Amount" value={`Rs. ${data.amount.toLocaleString()}`} />
              <Info label="Discount" value={`Rs. ${data.discount.toLocaleString()}`} />
              <Info label="Final Amount" value={`Rs. ${data.finalAmount.toLocaleString()}`} />
              <Info label="Balance Due" value={`Rs. ${data.balanceAmount.toLocaleString()}`} />
              <Info label="Due Date" value={formatDate(data.dueDate)} />
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Payment History</p>
              {data.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
              ) : (
                <ul className="divide-y border rounded-lg">
                  {data.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between p-3 text-sm">
                      <div>
                        <Link href={`/fees/payments/${p.id}/receipt`} className="font-medium hover:underline">{p.receiptNumber}</Link>
                        <p className="text-xs text-muted-foreground">{formatDate(p.paymentDate)} · {p.paymentMethod.replace(/_/g, " ")}</p>
                      </div>
                      <span className="font-semibold">Rs. {p.amountPaid.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
