import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { success, created, failure } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";
import { z } from "zod";

const documentSchema = z.object({
  documentType: z.enum([
    "BIRTH_CERTIFICATE", "TRANSFER_CERTIFICATE", "REPORT_CARD", "CNIC_B_FORM",
    "VACCINATION_RECORD", "PHOTOGRAPH", "DEGREE", "CNIC", "RESUME", "CONTRACT", "OTHER",
  ]),
  fileName: z.string().min(1),
  fileUrl: z.string().min(1, "File URL is required — upload the file to storage first"),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("employees.view");
  if (guard.error) return guard.error;

  const documents = await prisma.employeeDocument.findMany({
    where: { employeeId: params.id },
    orderBy: { uploadedAt: "desc" },
  });

  return success(documents);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission("employees.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = documentSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const employee = await prisma.employee.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!employee) return failure("Employee not found", 404);

  const document = await prisma.employeeDocument.create({
    data: { ...parsed.data, employeeId: params.id, uploadedById: guard.payload!.sub },
  });

  await logAudit({
    userId: guard.payload!.sub,
    action: "CREATE",
    entityType: "EmployeeDocument",
    entityId: document.id,
    newValues: { documentType: document.documentType, fileName: document.fileName },
    ipAddress,
    userAgent,
  });

  return created(document);
}
