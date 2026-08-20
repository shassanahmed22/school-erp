"use client";

import { PageHeader } from "@/components/shared/page-header";
import { useAuthStore } from "@/store/auth-store";
import { StudentAssignmentsView } from "./student-assignments-view";
import { TeacherAssignmentsView } from "./teacher-assignments-view";

export default function AssignmentsPage() {
  const { user } = useAuthStore();
  const isStudentOrParent = user?.roles?.some((r) => r === "student" || r === "parent");

  if (isStudentOrParent) {
    return (
      <div>
        <PageHeader title="Assignments" description="View and submit your homework assignments." />
        <StudentAssignmentsView />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Assignments" description="Post homework assignments and grade student submissions." />
      <TeacherAssignmentsView />
    </div>
  );
}
