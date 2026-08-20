"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Tag, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { toast } from "@/components/ui/toaster";
import type { BookCategoryItem } from "@/types";

export function BookCategoriesTab() {
  const [categories, setCategories] = useState<BookCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BookCategoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/book-categories");
      const json = await res.json();
      setCategories(res.ok ? json.data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  async function handleCreate() {
    if (!name) { toast({ title: "Category name is required", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/book-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Failed to create category", description: json.message, variant: "destructive" }); return; }
      toast({ title: "Category created", variant: "success" });
      setName(""); setDescription("");
      setFormOpen(false);
      fetchCategories();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/book-categories/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Failed to delete category", description: json.message, variant: "destructive" }); return; }
      toast({ title: "Category deleted", variant: "success" });
      setDeleteTarget(null);
      fetchCategories();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <Button onClick={() => setFormOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> Add Category</Button>
      </div>

      {loading ? (
        <Card className="p-4"><TableSkeleton rows={4} cols={2} /></Card>
      ) : categories.length === 0 ? (
        <Card><EmptyState title="No categories yet" /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                      <Tag className="h-4.5 w-4.5 text-indigo-600" />
                    </div>
                    <p className="font-semibold text-sm">{c.name}</p>
                  </div>
                  <button onClick={() => setDeleteTarget(c)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{c.description || "No description"}</p>
                <Badge variant="secondary">{c.bookCount ?? 0} books</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Book Category</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Category Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Science" />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting}>{submitting ? "Saving..." : "Save Category"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete category?"
        description="Categories with books assigned cannot be deleted."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
