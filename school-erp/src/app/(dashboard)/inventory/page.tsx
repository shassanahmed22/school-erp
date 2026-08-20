import { requirePagePermission } from "@/lib/page-guard";
import { InventoryPageClient } from "./inventory-page-client";

export default async function InventoryPage() {
  await requirePagePermission("inventory-items.view");
  return <InventoryPageClient />;
}
