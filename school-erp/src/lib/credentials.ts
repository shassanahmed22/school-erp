import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { hashPassword } from "@/lib/auth";

const AMBIGUOUS_CHARS = /[0OoIl1]/; // excluded so a handwritten copy of the password can't be misread

const UPPER = "ABCDEFGHJKMNPQRSTUVWXYZ";
const LOWER = "abcdefghjkmnpqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%*";

function randomChar(charset: string): string {
  const bytes = new Uint8Array(1);
  crypto.getRandomValues(bytes);
  return charset[bytes[0] % charset.length];
}

/**
 * Generates a random temporary password that satisfies the app's password
 * policy (8+ chars, an uppercase letter, a number) plus a symbol for extra
 * strength, using a character set with visually-ambiguous characters
 * removed — this is meant to be handed to someone on paper or read aloud,
 * not just pasted.
 */
export function generateTempPassword(): string {
  const required = [randomChar(UPPER), randomChar(LOWER), randomChar(DIGITS), randomChar(SYMBOLS)];
  const all = UPPER + LOWER + DIGITS;
  const rest = Array.from({ length: 6 }, () => randomChar(all));
  const chars = [...required, ...rest];
  // Shuffle so the required characters aren't always in the same position
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor((crypto.getRandomValues(new Uint8Array(1))[0] / 256) * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

/**
 * Builds a synthetic-but-stable login email for a person who doesn't have a
 * real one on file (common for students, sometimes for guardians) —
 * `{slug}@{suffix}`, guaranteed unique by appending a short random suffix on
 * collision. Never used for staff/teacher accounts, which always require a
 * real email since they're expected to also receive real correspondence.
 */
export async function buildSyntheticEmail(slug: string, suffix: string): Promise<string> {
  const base = `${slug.toLowerCase().replace(/[^a-z0-9]/g, "")}@${suffix}`;
  const existing = await prisma.user.findUnique({ where: { email: base } });
  if (!existing) return base;

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `${base.split("@")[0]}${Math.floor(1000 + Math.random() * 9000)}@${suffix}`;
    const taken = await prisma.user.findUnique({ where: { email: candidate } });
    if (!taken) return candidate;
  }
  // Extremely unlikely fallback
  return `${base.split("@")[0]}${Date.now()}@${suffix}`;
}

export interface GeneratedCredential {
  forName: string;
  role: "student" | "parent" | "teacher";
  email: string;
  temporaryPassword: string;
}

/**
 * Creates a brand-new portal login account with a random temporary password,
 * assigns the given role, and returns the plaintext password exactly once —
 * it is never stored anywhere except as a bcrypt hash from this point on.
 * The caller is responsible for showing it to whoever is creating the
 * record, since this is the only moment it will ever be visible again.
 */
export async function createPortalAccount(params: {
  tx: Prisma.TransactionClient;
  firstName: string;
  lastName: string;
  email: string;
  roleSlug: "student" | "parent" | "teacher";
  createdById?: string;
}) {
  const { tx, firstName, lastName, email, roleSlug, createdById } = params;

  const role = await tx.role.findUnique({ where: { slug: roleSlug } });
  if (!role) throw new Error(`Role "${roleSlug}" is not seeded — cannot create a portal account`);

  const temporaryPassword = generateTempPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  const user = await tx.user.create({
    data: {
      firstName,
      lastName,
      email,
      passwordHash,
      status: "ACTIVE",
      mustChangePassword: true,
      createdById,
      userRoles: { create: { roleId: role.id } },
    },
  });

  return { user, temporaryPassword };
}
