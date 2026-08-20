import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { assignScholarshipSchema } from "@/lib/validators/scholarship.validator";
import { success, created, failure } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const guard = await requirePermission("scholarships.view");
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");
  if (!studentId) return failure("studentId is required", 400);

  const assignments = await prisma.studentScholarship.findMany({
    where: { studentId },
    include: { scholarship: true },
    orderBy: { assignedDate: "desc" },
  });

  return success(
    assignments.map((a) => ({
      id: a.id,
      scholarshipId: a.scholarshipId,
      name: a.scholarship.name,
      type: a.scholarship.type,
      value: Number(a.scholarship.value),
      assignedDate: a.assignedDate,
    }))
  );
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("scholarships.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = assignScholarshipSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.studentScholarship.findUnique({
    where: { studentId_scholarshipId: parsed.data },
  });
  if (existing) return failure("This scholarship is already assigned to the student", 409);

  const assignment = await prisma.studentScholarship.create({
    data: { ...parsed.data, assignedById: guard.payload!.sub },
  });

  await logAudit({ userId: guard.payload!.sub, action: "UPDATE", entityType: "StudentScholarship", entityId: assignment.id, newValues: parsed.data, ipAddress, userAgent });
  await logActivity({ userId: guard.payload!.sub, type: "SCHOLARSHIP", description: "Assigned scholarship to student" });

  return created(assignment);
}
