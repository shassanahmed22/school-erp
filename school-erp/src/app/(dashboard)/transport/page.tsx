"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LayoutDashboard, Bus, UserCog, Route as RouteIcon, Users } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { TransportOverviewTab } from "./transport-overview-tab";
import { VehiclesTab } from "./vehicles-tab";
import { DriversTab } from "./drivers-tab";
import { RoutesTab } from "./routes-tab";
import { StudentAssignmentsTab } from "./student-assignments-tab";
import { MyTransportView } from "./my-transport-view";

export default function TransportPage() {
  const { user } = useAuthStore();
  const isStudentOrParent = user?.roles?.some((r) => r === "student" || r === "parent");

  if (isStudentOrParent) {
    return (
      <div>
        <PageHeader title="Transport" description="View your assigned route and pickup details." />
        <MyTransportView />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Transport Management" description="Manage vehicles, drivers, routes, and student transport assignments." />

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview"><LayoutDashboard className="mr-1.5 h-4 w-4" /> Overview</TabsTrigger>
          <TabsTrigger value="vehicles"><Bus className="mr-1.5 h-4 w-4" /> Vehicles</TabsTrigger>
          <TabsTrigger value="drivers"><UserCog className="mr-1.5 h-4 w-4" /> Drivers</TabsTrigger>
          <TabsTrigger value="routes"><RouteIcon className="mr-1.5 h-4 w-4" /> Routes</TabsTrigger>
          <TabsTrigger value="assignments"><Users className="mr-1.5 h-4 w-4" /> Student Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><TransportOverviewTab /></TabsContent>
        <TabsContent value="vehicles"><VehiclesTab /></TabsContent>
        <TabsContent value="drivers"><DriversTab /></TabsContent>
        <TabsContent value="routes"><RoutesTab /></TabsContent>
        <TabsContent value="assignments"><StudentAssignmentsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
