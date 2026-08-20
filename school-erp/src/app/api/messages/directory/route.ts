import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { success, unauthorized } from "@/lib/api-response";

// Lightweight user directory for the "compose message" recipient picker.
// Only basic identifying info is exposed — no permission gate beyond login,
// since every role is allowed to send messages to any other portal user.
export async function GET(req: NextRequest) {
  const payload = await getCurrentUserFromCookies();
  if (!payload) return unauthorized();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || undefined;

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      id: { not: payload.sub },
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    },
    orderBy: { firstName: "asc" },
    take: 50,
    include: { userRoles: { include: { role: true } } },
  });

  return success(
    users.map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      email: u.email,
      roles: u.userRoles.map((ur) => ur.role.name),
    }))
  );
}
