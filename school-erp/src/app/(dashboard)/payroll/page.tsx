"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Banknote, Settings2 } from "lucide-react";
import { usePermission } from "@/hooks/use-permission";
import { PayrollTab } from "./payroll-tab";
import { SalaryStructureTab } from "./salary-structure-tab";
import { MyPayslipsView } from "./my-payslips-view";

export default function PayrollPage() {
  const canManage = usePermission("payroll.create");
  const canView = usePermission("payroll.view");

  if (!canView && !canManage) {
    return (
      <div>
        <PageHeader title="My Payslips" description="View your salary history and download payslips." />
        <MyPayslipsView />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Payroll Management" description="Generate monthly payroll, manage salary structures, and track payments." />

      <Tabs defaultValue="payroll">
        <TabsList>
          <TabsTrigger value="payroll"><Banknote className="mr-1.5 h-4 w-4" /> Payroll</TabsTrigger>
          <TabsTrigger value="structures"><Settings2 className="mr-1.5 h-4 w-4" /> Salary Structures</TabsTrigger>
        </TabsList>

        <TabsContent value="payroll"><PayrollTab /></TabsContent>
        <TabsContent value="structures"><SalaryStructureTab /></TabsContent>
      </Tabs>
    </div>
  );
}
