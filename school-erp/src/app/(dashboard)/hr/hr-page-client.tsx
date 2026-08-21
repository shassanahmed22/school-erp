"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Users, Building2, Tag } from "lucide-react";
import { EmployeesTab } from "./employees-tab";
import { DepartmentsTab } from "./departments-tab";
import { DesignationsTab } from "./designations-tab";

export function HrPageClient() {
  return (
    <div>
      <PageHeader title="HR & Staff Management" description="Manage employee profiles, departments, and designations." />

      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees"><Users className="mr-1.5 h-4 w-4" /> Employees</TabsTrigger>
          <TabsTrigger value="departments"><Building2 className="mr-1.5 h-4 w-4" /> Departments</TabsTrigger>
          <TabsTrigger value="designations"><Tag className="mr-1.5 h-4 w-4" /> Designations</TabsTrigger>
        </TabsList>

        <TabsContent value="employees"><EmployeesTab /></TabsContent>
        <TabsContent value="departments"><DepartmentsTab /></TabsContent>
        <TabsContent value="designations"><DesignationsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
