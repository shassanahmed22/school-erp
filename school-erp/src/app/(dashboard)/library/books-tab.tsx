"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search, ChevronLeft, ChevronRight, Trash2, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ExportButtons } from "@/components/shared/export-buttons";
import { usePermission } from "@/hooks/use-permission";
import { toast } from "@/components/ui/toaster";
import type { BookItem, BookCategoryItem } from "@/types";
import { BookFormDialog } from "./book-form-dialog";

export function BooksTab() {
  const canCreate = usePermission("books.create");
  const canDelete = usePermission("books.delete");

  const [books, setBooks] = useState<BookItem[]>([]);
  const [categories, setCategories] = useState<BookCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BookItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetch("/api/book-categories").then((r) => r.json()).then((j) => setCategories(j.data ?? [])); }, []);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "12" });
      if (search) params.set("search", search);
      if (categoryFilter !== "ALL") params.set("categoryId", categoryFilter);
      const res = await fetch(`/api/books?${params}`);
      const json = await res.json();
      setBooks(res.ok ? json.data : []);
      setTotalPages(json.pagination?.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, page]);

  useEffect(() => {
    const t = setTimeout(fetchBooks, 300);
    return () => clearTimeout(t);
  }, [fetchBooks]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/books/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Failed to delete book", description: json.message, variant: "destructive" }); return; }
      toast({ title: "Book deleted", variant: "success" });
      setDeleteTarget(null);
      fetchBooks();
    } finally {
      setDeleting(false);
    }
  }

  const exportRows = books.map((b) => [b.title, b.author, b.categoryName, b.isbn ?? "", b.quantity, b.availableQuantity, b.shelfLocation ?? ""]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search title, author, ISBN..." className="pl-9" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
          </div>
          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <ExportButtons filename="books" headers={["Title", "Author", "Category", "ISBN", "Quantity", "Available", "Shelf"]} rows={exportRows} />
          {canCreate && <Button onClick={() => setFormOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> Add Book</Button>}
        </div>
      </div>

      <Card className="p-4">
        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : books.length === 0 ? (
          <EmptyState title="No books found" description="Add your first book to the catalog." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Shelf</TableHead>
                  <TableHead>Availability</TableHead>
                  {canDelete && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {books.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{b.title}</p>
                          <p className="text-xs text-muted-foreground">{b.author}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{b.categoryName}</TableCell>
                    <TableCell className="text-muted-foreground">{b.shelfLocation ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={b.availableQuantity > 0 ? "success" : "destructive"}>{b.availableQuantity} / {b.quantity} available</Badge>
                    </TableCell>
                    {canDelete && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(b)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <BookFormDialog open={formOpen} onOpenChange={setFormOpen} categories={categories} onSaved={fetchBooks} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete book?"
        description="Books with copies currently issued cannot be deleted."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
