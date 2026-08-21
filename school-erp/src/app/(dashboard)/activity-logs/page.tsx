import { requirePagePermission } from "@/lib/page-guard";
import { ActivityLogsPageClient } from "./activity-logs-page-client";

export default async function ActivityLogsPage() {
  await requirePagePermission("activity-logs.view");
  return <ActivityLogsPageClient />;
}
