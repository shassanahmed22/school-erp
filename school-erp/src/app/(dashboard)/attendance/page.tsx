"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CalendarCheck, History, BarChart3 } from "lucide-react";
import { MarkAttendanceTab } from "./mark-attendance-tab";
import { AttendanceHistoryTab } from "./attendance-history-tab";
import { AttendanceReportsTab } from "./attendance-reports-tab";

export default function AttendancePage() {
  return (
    <div>
      <PageHeader title="Attendance Management" description="Mark daily attendance, review history, and generate monthly reports." />

      <Tabs defaultValue="mark">
        <TabsList>
          <TabsTrigger value="mark"><CalendarCheck className="mr-1.5 h-4 w-4" /> Mark Attendance</TabsTrigger>
          <TabsTrigger value="history"><History className="mr-1.5 h-4 w-4" /> History</TabsTrigger>
          <TabsTrigger value="reports"><BarChart3 className="mr-1.5 h-4 w-4" /> Monthly Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="mark"><MarkAttendanceTab /></TabsContent>
        <TabsContent value="history"><AttendanceHistoryTab /></TabsContent>
        <TabsContent value="reports"><AttendanceReportsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
