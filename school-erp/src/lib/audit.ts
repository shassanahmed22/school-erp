import { prisma } from "./prisma";
import type { AuditAction, ActivityType } from "@prisma/client";

export async function logAudit(params: {
  userId?: string | null;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  oldValues?: object;
  newValues?: object;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  return prisma.auditLog.create({
    data: {
      userId: params.userId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      oldValues: params.oldValues,
      newValues: params.newValues,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}

export async function logActivity(params: {
  userId?: string | null;
  type: ActivityType;
  description: string;
  metadata?: object;
}) {
  return prisma.activityLog.create({
    data: {
      userId: params.userId ?? null,
      type: params.type,
      description: params.description,
      metadata: params.metadata,
    },
  });
}

export function getRequestMeta(req: Request) {
  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";
  return { ipAddress, userAgent };
}
