import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validators/auth.validator";
import { generateSecureToken, hashToken } from "@/lib/auth";
import { success, failure } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const { ipAddress, userAgent } = getRequestMeta(req);
  const body = await req.json();
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const user = await prisma.user.findFirst({ where: { email: parsed.data.email, deletedAt: null } });

  // Always respond success to prevent email enumeration attacks
  if (user) {
    const token = generateSecureToken();
    const tokenHash = await hashToken(token);
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Only the hash is stored — a database leak alone can't be used to reset
    // this account's password, since the raw token never touches the database.
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: tokenHash, passwordResetExpires: expires },
    });

    await logAudit({ userId: user.id, action: "PASSWORD_RESET", entityType: "User", entityId: user.id, ipAddress, userAgent });

    // TODO: integrate transactional email provider (SES/SendGrid/Resend) to email:
    // `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`   (raw token, not the hash)
    console.log(`[DEV] Password reset link for ${user.email}: /reset-password?token=${token}`);
  }

  return success(null, "If an account exists, a reset link has been sent.");
}
