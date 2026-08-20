import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { createSubjectSchema } from "@/lib/validators/subject.validator";
import { success, created, failure } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function GET() {
  const guard = await requirePermission("subjects.view");
  if (guard.error) return guard.error;

  const subjects = await prisma.subject.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    include: { _count: { select: { classSubjects: true } } },
  });

  return success(
    subjects.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      description: s.description,
      classCount: s._count.classSubjects,
    }))
  );
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("subjects.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = createSubjectSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.subject.findUnique({ where: { code: parsed.data.code } });
  if (existing) return failure("A subject with this code already exists", 409);

  const subject = await prisma.subject.create({ data: parsed.data });

  await logAudit({ userId: guard.payload!.sub, action: "CREATE", entityType: "Subject", entityId: subject.id, newValues: parsed.data, ipAddress, userAgent });
  await logActivity({ userId: guard.payload!.sub, type: "SUBJECT", description: `Created subject: ${subject.name}` });

  return created(subject);
}
