"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Tag, Trash2, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { usePermission } from "@/hooks/use-permission";
import { toast } from "@/components/ui/toaster";
import { formatDate } from "@/lib/utils";
import type { FeeCategoryItem, FeeStructureItem, ClassItem, AcademicYearItem } from "@/types";
import { CategoryFormDialog } from "./category-form-dialog";
import { StructureFormDialog } from "./structure-form-dialog";

export function FeeStructureTab() {
  const canCreate = usePermission("fee-structures.create");
  const canDeleteCategory = usePermission("fee-categories.delete");
  const canDeleteStructure = usePermission("fee-structures.delete");

  const [categories, setCategories] = useState<FeeCategoryItem[]>([]);
  const [structures, setStructures] = useState<FeeStructureItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearItem[]>([]);
  const [classFilter, setClassFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<FeeCategoryItem | null>(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<FeeCategoryItem | null>(null);

  const [structureDialogOpen, setStructureDialogOpen] = useState(false);
  const [deleteStructureTarget, setDeleteStructureTarget] = useState<FeeStructureItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (classFilter !== "ALL") params.set("classId", classFilter);
      const [catRes, structRes] = await Promise.all([
        fetch("/api/fee-categories").then((r) => r.json()),
        fetch(`/api/fee-structures?${params}`).then((r) => r.json()),
      ]);
      setCategories(catRes.data ?? []);
      setStructures(structRes.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [classFilter]);

  useEffect(() => {
    fetch("/api/classes").then((r) => r.json()).then((j) => setClasses(j.data ?? []));
    fetch("/api/academic-years").then((r) => r.json()).then((j) => setAcademicYears(j.data ?? []));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleDeleteCategory() {
    if (!deleteCategoryTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/fee-categories/${deleteCategoryTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Failed to delete category", description: json.message, variant: "destructive" }); return; }
      toast({ title: "Category deleted", variant: "success" });
      setDeleteCategoryTarget(null);
      fetchAll();
    } finally { setDeleting(false); }
  }

  async function handleDeleteStructure() {
    if (!deleteStructureTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/fee-structures/${deleteStructureTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Failed to delete fee structure", description: json.message, variant: "destructive" }); return; }
      toast({ title: "Fee structure deleted", variant: "success" });
      setDeleteStructureTarget(null);
      fetchAll();
    } finally { setDeleting(false); }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Fee Categories</CardTitle>
          {canCreate && (
            <Button size="sm" onClick={() => { setEditCategory(null); setCategoryDialogOpen(true); }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Category
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={3} cols={3} />
          ) : categories.length === 0 ? (
            <EmptyState title="No fee categories yet" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categories.map((c) => (
                <div key={c.id} className="rounded-lg border p-3 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.structureCount ?? 0} structure(s)</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {canCreate && (
                      <button onClick={() => { setEditCategory(c); setCategoryDialogOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    )}
                    {canDeleteCategory && (
                      <button onClick={() => setDeleteCategoryTarget(c)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle>Fee Structures</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Classes</SelectItem>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {canCreate && (
              <Button size="sm" onClick={() => setStructureDialogOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Fee Structure
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : structures.length === 0 ? (
            <EmptyState title="No fee structures found" description="Create a fee structure to start assigning fees to students." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Academic Year</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Assigned</TableHead>
                  {canDeleteStructure && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {structures.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.feeCategoryName}</TableCell>
                    <TableCell>{s.className}</TableCell>
                    <TableCell>{s.academicYearName}</TableCell>
                    <TableCell>Rs. {s.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(s.dueDate)}</TableCell>
                    <TableCell><Badge variant="secondary">{s.assignedCount ?? 0} students</Badge></TableCell>
                    {canDeleteStructure && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setDeleteStructureTarget(s)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CategoryFormDialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen} category={editCategory} onSaved={fetchAll} />
      <StructureFormDialog
        open={structureDialogOpen}
        onOpenChange={setStructureDialogOpen}
        classes={classes}
        academicYears={academicYears}
        categories={categories}
        onSaved={fetchAll}
      />

      <ConfirmDialog
        open={!!deleteCategoryTarget}
        onOpenChange={(o) => !o && setDeleteCategoryTarget(null)}
        title="Delete fee category?"
        description={`This will remove "${deleteCategoryTarget?.name}". Categories in use by a fee structure cannot be deleted.`}
        onConfirm={handleDeleteCategory}
        loading={deleting}
      />
      <ConfirmDialog
        open={!!deleteStructureTarget}
        onOpenChange={(o) => !o && setDeleteStructureTarget(null)}
        title="Delete fee structure?"
        description="Structures already assigned to students cannot be deleted."
        onConfirm={handleDeleteStructure}
        loading={deleting}
      />
    </div>
  );
}
