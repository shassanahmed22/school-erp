import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { z } from "zod";
import { success, failure } from "@/lib/api-response";
import { logAudit, getRequestMeta } from "@/lib/audit";

const bulkLinkSchema = z.object({
  rows: z
    .array(
      z.object({
        registrationNumber: z.string().min(1),
        guardianPhone: z.string().min(1),
        parentEmail: z.string().email(),
      })
    )
    .min(1)
    .max(500),
});

interface RowResult {
  registrationNumber: string;
  guardianPhone: string;
  parentEmail: string;
  status: "linked" | "skipped";
  reason?: string;
}

/**
 * Links many guardian records to parent portal accounts in one request —
 * for onboarding an existing school's data instead of linking one guardian
 * at a time from each student's profile page.
 *
 * Every row is matched by (student registration number + guardian phone) to
 * avoid ambiguity when a student has multiple guardians (e.g. both parents).
 */
export async function POST(req: NextRequest) {
  const guard = await requirePermission("students.edit");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = bulkLinkSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const { rows } = parsed.data;

  // Batch-fetch everything up front rather than one query per row.
  const registrationNumbers = [...new Set(rows.map((r) => r.registrationNumber))];
  const parentEmails = [...new Set(rows.map((r) => r.parentEmail))];

  const [students, parentUsers] = await Promise.all([
    prisma.student.findMany({
      where: { registrationNumber: { in: registrationNumbers }, deletedAt: null },
      include: { guardians: true },
    }),
    prisma.user.findMany({
      where: { email: { in: parentEmails }, deletedAt: null },
      include: { userRoles: { include: { role: true } } },
    }),
  ]);

  const studentByRegNo = new Map(students.map((s) => [s.registrationNumber, s]));
  const parentByEmail = new Map(parentUsers.map((u) => [u.email, u]));

  const results: RowResult[] = [];
  const updates: { guardianId: string; userId: string }[] = [];

  for (const row of rows) {
    const student = studentByRegNo.get(row.registrationNumber);
    if (!student) {
      results.push({ ...row, status: "skipped", reason: "Student registration number not found" });
      continue;
    }

    const guardian = student.guardians.find((g) => g.phone === row.guardianPhone);
    if (!guardian) {
      results.push({ ...row, status: "skipped", reason: "No guardian with that phone number for this student" });
      continue;
    }

    const parentUser = parentByEmail.get(row.parentEmail);
    if (!parentUser) {
      results.push({ ...row, status: "skipped", reason: "No account found with that email" });
      continue;
    }

    const isParentRole = parentUser.userRoles.some((ur) => ur.role.slug === "parent");
    if (!isParentRole) {
      results.push({ ...row, status: "skipped", reason: "Account does not have the Parent role" });
      continue;
    }

    updates.push({ guardianId: guardian.id, userId: parentUser.id });
    results.push({ ...row, status: "linked" });
  }

  // Prisma has no bulk-upsert-with-different-values primitive, but these are
  // simple single-column updates — still far cheaper than the N read queries
  // above would have been if done one row at a time.
  await Promise.all(
    updates.map((u) => prisma.guardian.update({ where: { id: u.guardianId }, data: { userId: u.userId } }))
  );

  await logAudit({
    userId: guard.payload!.sub,
    action: "UPDATE",
    entityType: "Guardian",
    newValues: { linked: updates.length, skipped: results.length - updates.length },
    ipAddress,
    userAgent,
  });

  return success(
    { linked: updates.length, skipped: results.length - updates.length, results },
    `Linked ${updates.length} of ${rows.length} row(s)`
  );
}
