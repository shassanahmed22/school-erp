"use client";

import { PageHeader } from "@/components/shared/page-header";
import { useAuthStore } from "@/store/auth-store";
import { MyTimetableView } from "./my-timetable-view";
import { TeacherScheduleView } from "./teacher-schedule-view";
import { SectionTimetableEditor } from "./section-timetable-editor";

export default function TimetablePage() {
  const { user } = useAuthStore();
  const isStudentOrParent = user?.roles?.some((r) => r === "student" || r === "parent");
  const isTeacherOnly =
    user?.roles?.includes("teacher") &&
    !user?.permissions?.includes("timetable.create");

  if (isStudentOrParent) {
    return (
      <div>
        <PageHeader title="Timetable" description="Your class's weekly schedule." />
        <MyTimetableView />
      </div>
    );
  }

  if (isTeacherOnly) {
    return (
      <div>
        <PageHeader title="My Schedule" description="Your personal weekly teaching schedule across all sections." />
        <TeacherScheduleView />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Timetable Management" description="Build and manage the weekly class schedule for every section." />
      <SectionTimetableEditor />
    </div>
  );
}
