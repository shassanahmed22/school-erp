"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LayoutDashboard, Layers, UserPlus, Receipt, Award } from "lucide-react";
import { usePermission } from "@/hooks/use-permission";
import { useAuthStore } from "@/store/auth-store";
import { OverviewTab } from "./overview-tab";
import { FeeStructureTab } from "./fee-structure-tab";
import { AssignFeesTab } from "./assign-fees-tab";
import { PaymentsTab } from "./payments-tab";
import { ScholarshipsTab } from "./scholarships-tab";
import { MyFeesView } from "./my-fees-view";

export default function FeesPage() {
  const { user } = useAuthStore();
  const canViewStructures = usePermission("fee-structures.view");
  const canViewPayments = usePermission("fee-payments.view");
  const isStudentOrParent = user?.roles?.some((r) => r === "student" || r === "parent");

  if (isStudentOrParent) {
    return (
      <div>
        <PageHeader title="My Fees" description="View your fee details and download payment receipts." />
        <MyFeesView />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Fees & Finance" description="Manage fee structures, assignments, collections, and scholarships." />

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview"><LayoutDashboard className="mr-1.5 h-4 w-4" /> Overview</TabsTrigger>
          {canViewStructures && <TabsTrigger value="structure"><Layers className="mr-1.5 h-4 w-4" /> Fee Structure</TabsTrigger>}
          <TabsTrigger value="assign"><UserPlus className="mr-1.5 h-4 w-4" /> Assign Fees</TabsTrigger>
          {canViewPayments && <TabsTrigger value="payments"><Receipt className="mr-1.5 h-4 w-4" /> Payments</TabsTrigger>}
          <TabsTrigger value="scholarships"><Award className="mr-1.5 h-4 w-4" /> Scholarships</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><OverviewTab /></TabsContent>
        {canViewStructures && <TabsContent value="structure"><FeeStructureTab /></TabsContent>}
        <TabsContent value="assign"><AssignFeesTab /></TabsContent>
        {canViewPayments && <TabsContent value="payments"><PaymentsTab /></TabsContent>}
        <TabsContent value="scholarships"><ScholarshipsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
