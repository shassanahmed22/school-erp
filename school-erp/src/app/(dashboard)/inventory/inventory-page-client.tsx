"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LayoutDashboard, Layers, Boxes, History } from "lucide-react";
import { InventoryOverviewTab } from "./inventory-overview-tab";
import { InventoryCategoriesTab } from "./inventory-categories-tab";
import { InventoryItemsTab } from "./items-tab";
import { InventoryTransactionsTab } from "./transactions-tab";

export function InventoryPageClient() {
  return (
    <div>
      <PageHeader title="Inventory Management" description="Track stock, categories, and stock movement across the school." />

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview"><LayoutDashboard className="mr-1.5 h-4 w-4" /> Overview</TabsTrigger>
          <TabsTrigger value="categories"><Layers className="mr-1.5 h-4 w-4" /> Categories</TabsTrigger>
          <TabsTrigger value="items"><Boxes className="mr-1.5 h-4 w-4" /> Items</TabsTrigger>
          <TabsTrigger value="transactions"><History className="mr-1.5 h-4 w-4" /> Stock Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><InventoryOverviewTab /></TabsContent>
        <TabsContent value="categories"><InventoryCategoriesTab /></TabsContent>
        <TabsContent value="items"><InventoryItemsTab /></TabsContent>
        <TabsContent value="transactions"><InventoryTransactionsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
