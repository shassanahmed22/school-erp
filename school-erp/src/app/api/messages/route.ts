import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { createMessageSchema } from "@/lib/validators/message.validator";
import { success, created, failure, notFound } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const guard = await requirePermission("messages.view");
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const box = searchParams.get("box") === "sent" ? "sent" : "inbox";
  const userId = guard.payload!.sub;

  const messages = await prisma.message.findMany({
    where:
      box === "sent"
        ? { senderId: userId, deletedBySender: false }
        : { recipientId: userId, deletedByRecipient: false },
    orderBy: { createdAt: "desc" },
    take: 100, // safety cap — an inbox can grow unbounded over years of use
    include: {
      sender: { select: { firstName: true, lastName: true, email: true } },
      recipient: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  return success(
    messages.map((m) => ({
      id: m.id,
      subject: m.subject,
      content: m.content,
      status: m.status,
      createdAt: m.createdAt,
      readAt: m.readAt,
      sender: { id: m.senderId, name: `${m.sender.firstName} ${m.sender.lastName}`, email: m.sender.email },
      recipient: { id: m.recipientId, name: `${m.recipient.firstName} ${m.recipient.lastName}`, email: m.recipient.email },
    }))
  );
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("messages.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = createMessageSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  if (parsed.data.recipientId === guard.payload!.sub) {
    return failure("You cannot send a message to yourself", 422);
  }

  const recipient = await prisma.user.findFirst({ where: { id: parsed.data.recipientId, deletedAt: null, status: "ACTIVE" } });
  if (!recipient) return notFound("Recipient not found");

  const message = await prisma.message.create({
    data: {
      senderId: guard.payload!.sub,
      recipientId: parsed.data.recipientId,
      subject: parsed.data.subject,
      content: parsed.data.content,
    },
  });

  await logAudit({ userId: guard.payload!.sub, action: "CREATE", entityType: "Message", entityId: message.id, ipAddress, userAgent });

  return created(message, "Message sent successfully");
}
