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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("teachers.view");
  if (guard.error) return guard.error;

  const documents = await prisma.teacherDocument.findMany({
    where: { teacherId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return success(documents);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("teachers.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = documentSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const teacher = await prisma.teacher.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!teacher) return failure("Teacher not found", 404);

  const document = await prisma.teacherDocument.create({
    data: { ...parsed.data, teacherId: params.id, uploadedById: guard.payload!.sub },
  });

  await logAudit({
    userId: guard.payload!.sub,
    action: "CREATE",
    entityType: "TeacherDocument",
    entityId: document.id,
    newValues: { type: document.type, fileName: document.fileName },
    ipAddress,
    userAgent,
  });

  return created(document);
}
