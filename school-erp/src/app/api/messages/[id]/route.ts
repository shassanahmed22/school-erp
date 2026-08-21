import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("messages.view");
  if (guard.error) return guard.error;
  const userId = guard.payload!.sub;

  const message = await prisma.message.findFirst({
    where: { id: params.id, OR: [{ senderId: userId }, { recipientId: userId }] },
    include: {
      sender: { select: { firstName: true, lastName: true, email: true } },
      recipient: { select: { firstName: true, lastName: true, email: true } },
    },
  });
  if (!message) return notFound("Message not found");

  // Mark as read the first time the recipient opens it
  if (message.recipientId === userId && message.status === "UNREAD") {
    await prisma.message.update({ where: { id: message.id }, data: { status: "READ", readAt: new Date() } });
    message.status = "READ";
    message.readAt = new Date();
  }

  return success({
    id: message.id,
    subject: message.subject,
    content: message.content,
    status: message.status,
    createdAt: message.createdAt,
    readAt: message.readAt,
    sender: { id: message.senderId, name: `${message.sender.firstName} ${message.sender.lastName}`, email: message.sender.email },
    recipient: { id: message.recipientId, name: `${message.recipient.firstName} ${message.recipient.lastName}`, email: message.recipient.email },
  });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("messages.delete");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);
  const userId = guard.payload!.sub;

  const message = await prisma.message.findFirst({
    where: { id: params.id, OR: [{ senderId: userId }, { recipientId: userId }] },
  });
  if (!message) return notFound("Message not found");

  const isSender = message.senderId === userId;
  const willBeDeletedBySender = isSender ? true : message.deletedBySender;
  const willBeDeletedByRecipient = isSender ? message.deletedByRecipient : true;

  if (willBeDeletedBySender && willBeDeletedByRecipient) {
    // Both sides have deleted it — remove for good
    await prisma.message.delete({ where: { id: message.id } });
  } else {
    await prisma.message.update({
      where: { id: message.id },
      data: isSender ? { deletedBySender: true } : { deletedByRecipient: true },
    });
  }

  await logAudit({ userId, action: "DELETE", entityType: "Message", entityId: message.id, ipAddress, userAgent });

  return success(null, "Message deleted");
}
