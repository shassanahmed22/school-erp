import { requirePagePermission } from "@/lib/page-guard";
import { AuditLogsPageClient } from "./audit-logs-page-client";

export default async function AuditLogsPage() {
  await requirePagePermission("audit-logs.view");
  return <AuditLogsPageClient />;
}
