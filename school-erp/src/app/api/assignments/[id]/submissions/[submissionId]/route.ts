import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { gradeSubmissionSchema } from "@/lib/validators/assignment-submission.validator";
import { success, failure, notFound } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string; submissionId: string } }) {
  const guard = await requirePermission("assignments.grade");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = gradeSubmissionSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const submission = await prisma.assignmentSubmission.findFirst({
    where: { id: params.submissionId, assignmentId: params.id },
    include: { assignment: { select: { maxMarks: true } } },
  });
  if (!submission) return notFound("Submission not found");

  if (submission.assignment.maxMarks && parsed.data.marksObtained > submission.assignment.maxMarks) {
    return failure(`Marks cannot exceed the maximum of ${submission.assignment.maxMarks}`, 422);
  }

  const updated = await prisma.assignmentSubmission.update({
    where: { id: params.submissionId },
    data: {
      marksObtained: parsed.data.marksObtained,
      feedback: parsed.data.feedback,
      status: "GRADED",
      gradedAt: new Date(),
      gradedById: guard.payload!.sub,
    },
  });

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "AssignmentSubmission", entityId: updated.id, newValues: parsed.data, ipAddress, userAgent });

  return success(updated, "Submission graded");
}
