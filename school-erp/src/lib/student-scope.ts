import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/rbac";
import type { JwtPayload } from "@/lib/auth";

export type StudentScope =
  | { type: "unrestricted" } // staff — access already gated by the caller's requirePermission check
  | { type: "single"; studentId: string } // the logged-in student, locked to themselves
  | { type: "list"; studentIds: string[] } // a parent, locked to their linked children
  | { type: "none" }; // authenticated as student/parent but no linked record found

/**
 * Resolves which student record(s) the current user may see, for any
 * endpoint (attendance, results, fees, payments, ...) that serves both a
 * staff list view and a student/parent self-service view through the same
 * route. Staff pass through unrestricted — their access is already gated by
 * the calling route's own requirePermission() check. Students are locked to
 * their own record. Parents are locked to the children linked to their
 * account via Guardian.userId — never to every student in the school.
 */
export async function resolveStudentScope(payload: JwtPayload): Promise<StudentScope> {
  const isSuperAdmin = hasRole(payload, "super-admin");

  if (hasRole(payload, "student") && !isSuperAdmin) {
    const student = await prisma.student.findUnique({ where: { userId: payload.sub } });
    return student ? { type: "single", studentId: student.id } : { type: "none" };
  }

  if (hasRole(payload, "parent") && !isSuperAdmin) {
    const guardians = await prisma.guardian.findMany({
      where: { userId: payload.sub },
      select: { studentId: true },
    });
    const studentIds = [...new Set(guardians.map((g) => g.studentId))];
    return studentIds.length > 0 ? { type: "list", studentIds } : { type: "none" };
  }

  return { type: "unrestricted" };
}

/**
 * Given a resolved scope and an optional studentId the caller asked to
 * filter by, returns the safe Prisma filter to actually apply. `forbidden`
 * means the requested student (or lack of any linked student) is outside
 * what this user may see — the route should return an empty result rather
 * than leak whether that student exists.
 */
export function applyStudentScope(
  scope: StudentScope,
  requestedStudentId: string | undefined
): { studentIdFilter?: string | { in: string[] }; forbidden: boolean } {
  if (scope.type === "unrestricted") {
    return { studentIdFilter: requestedStudentId, forbidden: false };
  }
  if (scope.type === "none") {
    return { forbidden: true };
  }
  if (scope.type === "single") {
    if (requestedStudentId && requestedStudentId !== scope.studentId) return { forbidden: true };
    return { studentIdFilter: scope.studentId, forbidden: false };
  }
  // scope.type === "list" (parent with one or more linked children)
  if (requestedStudentId) {
    if (!scope.studentIds.includes(requestedStudentId)) return { forbidden: true };
    return { studentIdFilter: requestedStudentId, forbidden: false };
  }
  return { studentIdFilter: { in: scope.studentIds }, forbidden: false };
}
