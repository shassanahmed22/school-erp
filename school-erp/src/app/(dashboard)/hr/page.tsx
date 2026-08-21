import { requirePagePermission } from "@/lib/page-guard";
import { HrPageClient } from "./hr-page-client";

export default async function HrPage() {
  await requirePagePermission("employees.view");
  return <HrPageClient />;
}
