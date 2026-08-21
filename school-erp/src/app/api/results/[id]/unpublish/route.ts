import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { unpublishExamResults } from "@/lib/grade-service";
import { success, failure } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

/** NOTE: [id] here is the examId — unpublishing reverts all results for an exam to DRAFT. */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("results.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const exam = await prisma.exam.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!exam) return failure("Exam not found", 404);

  const count = await unpublishExamResults(params.id);
  await prisma.exam.update({ where: { id: params.id }, data: { status: "COMPLETED" } });

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "Exam", entityId: params.id, newValues: { unpublishedResults: count }, ipAddress, userAgent });
  await logActivity({ userId: guard.payload!.sub, type: "RESULT", description: `Unpublished results for exam: ${exam.name}` });

  return success({ unpublished: count }, "Results unpublished");
}
