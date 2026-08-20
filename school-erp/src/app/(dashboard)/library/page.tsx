"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LayoutDashboard, BookOpen, RefreshCcw, Tag } from "lucide-react";
import { usePermission } from "@/hooks/use-permission";
import { useAuthStore } from "@/store/auth-store";
import { LibraryOverviewTab } from "./library-overview-tab";
import { BooksTab } from "./books-tab";
import { IssueReturnTab } from "./issue-return-tab";
import { BookCategoriesTab } from "./book-categories-tab";
import { MyLibraryView } from "./my-library-view";

export default function LibraryPage() {
  const { user } = useAuthStore();
  const canManage = usePermission("books.create");
  const isStudentOrParent = user?.roles?.some((r) => r === "student" || r === "parent");

  if (isStudentOrParent) {
    return (
      <div>
        <PageHeader title="Library" description="View your issued books, due dates, and fines." />
        <MyLibraryView />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Library Management" description="Manage books, categories, and issue/return records." />

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview"><LayoutDashboard className="mr-1.5 h-4 w-4" /> Overview</TabsTrigger>
          <TabsTrigger value="books"><BookOpen className="mr-1.5 h-4 w-4" /> Books</TabsTrigger>
          <TabsTrigger value="issue-return"><RefreshCcw className="mr-1.5 h-4 w-4" /> Issue / Return</TabsTrigger>
          {canManage && <TabsTrigger value="categories"><Tag className="mr-1.5 h-4 w-4" /> Categories</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview"><LibraryOverviewTab /></TabsContent>
        <TabsContent value="books"><BooksTab /></TabsContent>
        <TabsContent value="issue-return"><IssueReturnTab /></TabsContent>
        {canManage && <TabsContent value="categories"><BookCategoriesTab /></TabsContent>}
      </Tabs>
    </div>
  );
}
