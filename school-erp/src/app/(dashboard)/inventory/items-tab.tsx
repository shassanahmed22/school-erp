"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Boxes, Trash2, Pencil, PackagePlus, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { usePermission } from "@/hooks/use-permission";
import { toast } from "@/components/ui/toaster";
import { ItemFormDialog } from "./item-form-dialog";
import { StockTransactionDialog } from "./stock-transaction-dialog";
import type { InventoryCategoryItem, InventoryItemRow } from "@/types";

export function InventoryItemsTab() {
  const canCreate = usePermission("inventory-items.create");
  const canEdit = usePermission("inventory-items.edit");
  const canDelete = usePermission("inventory-items.delete");
  const canTransact = usePermission("inventory-transactions.create");

  const [items, setItems] = useState<InventoryItemRow[]>([]);
  const [categories, setCategories] = useState<InventoryCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItemRow | null>(null);
  const [stockDialogItem, setStockDialogItem] = useState<InventoryItemRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItemRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/inventory-categories");
    const json = await res.json();
    setCategories(res.ok ? json.data : []);
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryFilter !== "all") params.set("categoryId", categoryFilter);
      if (lowStockOnly) params.set("lowStockOnly", "true");
      const res = await fetch(`/api/inventory-items?${params.toString()}`);
      const json = await res.json();
      setItems(res.ok ? json.data : []);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, lowStockOnly]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => {
    const timeout = setTimeout(fetchItems, 300);
    return () => clearTimeout(timeout);
  }, [fetchItems]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/inventory-items/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Failed to delete item", description: json.message, variant: "destructive" }); return; }
      toast({ title: "Item deleted", variant: "success" });
      setDeleteTarget(null);
      fetchItems();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 justify-between mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 w-56" placeholder="Search items or SKU..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            variant={lowStockOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setLowStockOnly((v) => !v)}
          >
            Low Stock Only
          </Button>
        </div>
        {canCreate && (
          <Button onClick={() => { setEditingItem(null); setFormOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Item
          </Button>
        )}
      </div>

      <Card className="p-4">
        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : items.length === 0 ? (
          <EmptyState title="No items found" icon={<Boxes className="h-6 w-6 text-muted-foreground" />} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>
                    <p className="font-medium">{i.name}</p>
                    {i.sku && <p className="text-xs text-muted-foreground font-mono">{i.sku}</p>}
                  </TableCell>
                  <TableCell>{i.categoryName}</TableCell>
                  <TableCell>
                    <span className={i.isLowStock ? "text-destructive font-semibold" : ""}>
                      {i.quantity} {i.unit.toLowerCase()}
                    </span>
                    {i.isLowStock && <Badge variant="destructive" className="ml-2">Low</Badge>}
                  </TableCell>
                  <TableCell>Rs. {i.unitPrice.toLocaleString()}</TableCell>
                  <TableCell>Rs. {i.totalValue.toLocaleString()}</TableCell>
                  <TableCell><Badge variant={i.status === "ACTIVE" ? "success" : "secondary"}>{i.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {canTransact && (
                        <Button variant="ghost" size="icon" title="Update stock" onClick={() => setStockDialogItem(i)}>
                          <PackagePlus className="h-4 w-4" />
                        </Button>
                      )}
                      {canEdit && (
                        <Button variant="ghost" size="icon" title="Edit" onClick={() => { setEditingItem(i); setFormOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button variant="ghost" size="icon" title="Delete" onClick={() => setDeleteTarget(i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <ItemFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        editingItem={editingItem}
        onSaved={fetchItems}
      />

      <StockTransactionDialog
        open={!!stockDialogItem}
        onOpenChange={(o) => !o && setStockDialogItem(null)}
        item={stockDialogItem}
        onSaved={fetchItems}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete item?"
        description="This will remove the item from the active inventory list."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
