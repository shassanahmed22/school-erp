import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validators/auth.validator";
import { hashPassword, hashToken } from "@/lib/auth";
import { success, failure } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const { ipAddress, userAgent } = getRequestMeta(req);
  const body = await req.json();
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const { token, password } = parsed.data;
  const tokenHash = await hashToken(token);

  const user = await prisma.user.findFirst({
    where: { passwordResetToken: tokenHash, deletedAt: null },
  });

  if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
    return failure("This reset link is invalid or has expired.", 400);
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpires: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      tokenVersion: { increment: 1 }, // invalidate any sessions that predate this reset
    },
  });
  await prisma.userSession.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await logAudit({ userId: user.id, action: "PASSWORD_RESET", entityType: "User", entityId: user.id, ipAddress, userAgent });

  return success(null, "Password reset successfully. You can now log in.");
}
