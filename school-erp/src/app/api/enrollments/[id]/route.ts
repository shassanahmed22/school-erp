import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";
import { z } from "zod";

const updateEnrollmentSchema = z.object({
  status: z.enum(["ACTIVE", "COMPLETED", "WITHDRAWN", "TRANSFERRED"]).optional(),
  sectionId: z.string().uuid().optional(),
  rollNumber: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("enrollments.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = updateEnrollmentSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.studentEnrollment.findUnique({ where: { id: params.id } });
  if (!existing) return notFound("Enrollment not found");

  const enrollment = await prisma.studentEnrollment.update({
    where: { id: params.id },
    data: {
      ...parsed.data,
      ...(parsed.data.status && parsed.data.status !== "ACTIVE" && { leftAt: new Date() }),
    },
  });

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "StudentEnrollment", entityId: enrollment.id, newValues: parsed.data, ipAddress, userAgent });

  return success(enrollment);
}
