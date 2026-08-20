import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { publishExamResults } from "@/lib/grade-service";
import { success, failure } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

/** NOTE: [id] here is the examId, not a result id — publishing acts on all results for an exam at once. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("results.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const exam = await prisma.exam.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!exam) return failure("Exam not found", 404);

  const count = await publishExamResults(params.id);

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "Exam", entityId: params.id, newValues: { publishedResults: count }, ipAddress, userAgent });
  await logActivity({ userId: guard.payload!.sub, type: "RESULT", description: `Published results for exam: ${exam.name} (${count} students)` });

  return success({ published: count }, "Results published successfully");
}
