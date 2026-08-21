import { requirePagePermission } from "@/lib/page-guard";
import { BulkLinkGuardiansPageClient } from "./bulk-link-guardians-page-client";

export default async function BulkLinkGuardiansPage() {
  await requirePagePermission("students.edit");
  return <BulkLinkGuardiansPageClient />;
}
