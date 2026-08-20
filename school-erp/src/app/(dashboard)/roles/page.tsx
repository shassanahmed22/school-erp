import { requirePagePermission } from "@/lib/page-guard";
import { RolesPageClient } from "./roles-page-client";

export default async function RolesPage() {
  await requirePagePermission("roles.view");
  return <RolesPageClient />;
}
