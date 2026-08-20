import type { Prisma } from "@prisma/client";
import type { GuardianInput } from "@/lib/validators/student.validator";
import { createPortalAccount, type GeneratedCredential } from "@/lib/credentials";

/**
 * Reconciles a student's guardian rows against the incoming form data,
 * matching existing guardians by phone number instead of blindly deleting
 * and recreating every row on every edit — the previous approach silently
 * destroyed each guardian's linked parent-portal account (`Guardian.userId`)
 * on every single student edit, which would have quietly broken the parent
 * portal for every family each time an admin touched that student's record.
 *
 * For any guardian row that includes an email and doesn't already have a
 * linked portal account, this also creates one automatically:
 *  - if a user already exists with that email (e.g. a sibling's parent
 *    already has an account), it reuses that account and just links it —
 *    it does not create a duplicate login
 *  - otherwise it creates a brand-new "parent" role account with a random
 *    temporary password, which is returned (once) in `credentials` for the
 *    caller to display
 */
export async function syncStudentGuardians(
  tx: Prisma.TransactionClient,
  studentId: string,
  incoming: GuardianInput[],
  createdById?: string
): Promise<{ credentials: GeneratedCredential[] }> {
  const existing = await tx.guardian.findMany({ where: { studentId } });
  const existingByPhone = new Map(existing.map((g) => [g.phone, g]));
  const incomingPhones = new Set(incoming.map((g) => g.phone));

  const credentials: GeneratedCredential[] = [];

  // Remove guardians that were taken off the form entirely.
  const toRemove = existing.filter((g) => !incomingPhones.has(g.phone));
  if (toRemove.length > 0) {
    await tx.guardian.deleteMany({ where: { id: { in: toRemove.map((g) => g.id) } } });
  }

  for (const row of incoming) {
    const match = existingByPhone.get(row.phone);

    let guardianId: string;
    let currentUserId: string | null;

    if (match) {
      const updated = await tx.guardian.update({
        where: { id: match.id },
        data: {
          relation: row.relation,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email ?? null,
          occupation: row.occupation ?? null,
          cnic: row.cnic ?? null,
          address: row.address ?? null,
          isPrimary: row.isPrimary ?? false,
        },
      });
      guardianId = updated.id;
      currentUserId = updated.userId;
    } else {
      const created = await tx.guardian.create({
        data: {
          studentId,
          relation: row.relation,
          firstName: row.firstName,
          lastName: row.lastName,
          phone: row.phone,
          email: row.email ?? null,
          occupation: row.occupation ?? null,
          cnic: row.cnic ?? null,
          address: row.address ?? null,
          isPrimary: row.isPrimary ?? false,
        },
      });
      guardianId = created.id;
      currentUserId = null;
    }

    // Auto-link/create a parent portal account if this guardian has an email
    // and isn't linked to one yet.
    if (!currentUserId && row.email) {
      const existingUser = await tx.user.findFirst({ where: { email: row.email, deletedAt: null } });

      if (existingUser) {
        const alreadyParent = await tx.userRole.findFirst({
          where: { userId: existingUser.id, role: { slug: "parent" } },
        });
        if (!alreadyParent) {
          const parentRole = await tx.role.findUnique({ where: { slug: "parent" } });
          if (parentRole) await tx.userRole.create({ data: { userId: existingUser.id, roleId: parentRole.id } });
        }
        await tx.guardian.update({ where: { id: guardianId }, data: { userId: existingUser.id } });
      } else {
        const { user, temporaryPassword } = await createPortalAccount({
          tx,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          roleSlug: "parent",
          createdById,
        });
        await tx.guardian.update({ where: { id: guardianId }, data: { userId: user.id } });
        credentials.push({
          forName: `${row.firstName} ${row.lastName} (parent)`,
          role: "parent",
          email: user.email,
          temporaryPassword,
        });
      }
    }
  }

  return { credentials };
}
