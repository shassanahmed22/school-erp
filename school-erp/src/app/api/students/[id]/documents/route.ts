import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { success, created, failure } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";
import { z } from "zod";

const documentSchema = z.object({
  type: z.enum([
    "BIRTH_CERTIFICATE", "TRANSFER_CERTIFICATE", "REPORT_CARD", "CNIC_B_FORM",
    "VACCINATION_RECORD", "PHOTOGRAPH", "DEGREE", "CNIC", "RESUME", "CONTRACT", "OTHER",
  ]),
  fileName: z.string().min(1),
  fileUrl: z.string().min(1, "File URL is required — upload the file to storage first"),
});

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("students.view");
  if (guard.error) return guard.error;

  const documents = await prisma.studentDocument.findMany({
    where: { studentId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return success(documents);
}

/**
 * NOTE: This endpoint registers document *metadata* only. Actual file bytes should be
 * uploaded to your object storage (S3-compatible) from the client first, then the
 * resulting URL passed here. See README §12 for wiring instructions.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const guard = await requirePermission("students.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = documentSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const student = await prisma.student.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!student) return failure("Student not found", 404);

  const document = await prisma.studentDocument.create({
    data: { ...parsed.data, studentId: params.id, uploadedById: guard.payload!.sub },
  });

  await logAudit({
    userId: guard.payload!.sub,
    action: "CREATE",
    entityType: "StudentDocument",
    entityId: document.id,
    newValues: { type: document.type, fileName: document.fileName },
    ipAddress,
    userAgent,
  });

  return created(document);
}
