import { requirePagePermission } from "@/lib/page-guard";
import { UsersPageClient } from "./users-page-client";

export default async function UsersPage() {
  await requirePagePermission("users.view");
  return <UsersPageClient />;
}
