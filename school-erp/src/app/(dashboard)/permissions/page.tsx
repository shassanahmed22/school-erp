import { requirePagePermission } from "@/lib/page-guard";
import { PermissionsPageClient } from "./permissions-page-client";

export default async function PermissionsPage() {
  await requirePagePermission("permissions.view");
  return <PermissionsPageClient />;
}
