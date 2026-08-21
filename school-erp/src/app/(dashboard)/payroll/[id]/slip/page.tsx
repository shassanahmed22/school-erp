"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const MONTHS = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface SlipData {
  id: string;
  employee: { firstName: string; lastName: string; employeeCode: string; departmentName: string; designationTitle: string };
  month: number;
  year: number;
  basicSalary: number;
  allowances: number;
  bonus: number;
  deductions: number;
  grossSalary: number;
  netSalary: number;
  paymentStatus: string;
  paymentDate: string | null;
}

export default function SalarySlipPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [slip, setSlip] = useState<SlipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/payroll/${params.id}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) { setError(json.message); return; }
        setSlip(json.data);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (error || !slip) {
    return <Card><CardContent className="p-8 text-center text-muted-foreground">{error ?? "Salary slip not found."}</CardContent></Card>;
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
                <p className="text-xs text-muted-foreground">Salary Slip</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Pay Period</p>
              <p className="font-semibold">{MONTHS[slip.month]} {slip.year}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <Info label="Employee Name" value={`${slip.employee.firstName} ${slip.employee.lastName}`} />
            <Info label="Employee Code" value={slip.employee.employeeCode} mono />
            <Info label="Department" value={slip.employee.departmentName} />
            <Info label="Designation" value={slip.employee.designationTitle} />
          </div>

          <div className="rounded-lg border divide-y mb-6">
            <Row label="Basic Salary" value={slip.basicSalary} />
            <Row label="Allowances" value={slip.allowances} />
            <Row label="Bonus" value={slip.bonus} />
            <Row label="Gross Salary" value={slip.grossSalary} bold />
            <Row label="Deductions" value={-slip.deductions} />
            <Row label="Net Salary" value={slip.netSalary} bold highlight />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Payment Status</span>
            <Badge variant={slip.paymentStatus === "PAID" ? "success" : "warning"}>{slip.paymentStatus}</Badge>
          </div>
          {slip.paymentDate && (
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-muted-foreground">Payment Date</span>
              <span>{new Date(slip.paymentDate).toLocaleDateString()}</span>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground mt-8 pt-6 border-t">This is a computer-generated salary slip and does not require a physical signature.</p>
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

function Row({ label, value, bold, highlight }: { label: string; value: number; bold?: boolean; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-4 py-2.5 text-sm ${highlight ? "bg-muted/50" : ""}`}>
      <span className={bold ? "font-semibold" : "text-muted-foreground"}>{label}</span>
      <span className={bold ? "font-bold" : ""}>{value < 0 ? "-" : ""}Rs. {Math.abs(value).toLocaleString()}</span>
    </div>
  );
}
