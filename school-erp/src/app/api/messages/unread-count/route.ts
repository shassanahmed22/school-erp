import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { success } from "@/lib/api-response";

export async function GET() {
  const guard = await requirePermission("messages.view");
  if (guard.error) return guard.error;

  const unreadCount = await prisma.message.count({
    where: { recipientId: guard.payload!.sub, status: "UNREAD", deletedByRecipient: false },
  });

  return success({ unreadCount });
}
