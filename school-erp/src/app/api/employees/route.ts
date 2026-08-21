import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { createEmployeeSchema, employeeQuerySchema } from "@/lib/validators/employee.validator";
import { generateEmployeeCode } from "@/lib/id-generator";
import { paginated, created, failure } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const guard = await requirePermission("employees.view");
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const parsed = employeeQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return failure("Invalid query parameters", 422, parsed.error.flatten());

  const { page, limit, search, departmentId, designationId, status } = parsed.data;

  const where = {
    deletedAt: null,
    ...(departmentId && { departmentId }),
    ...(designationId && { designationId }),
    ...(status && { status }),
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: "insensitive" as const } },
        { lastName: { contains: search, mode: "insensitive" as const } },
        { employeeCode: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { department: { select: { name: true } }, designation: { select: { title: true } } },
    }),
    prisma.employee.count({ where }),
  ]);

  const data = items.map((e) => ({
    id: e.id,
    employeeCode: e.employeeCode,
    firstName: e.firstName,
    lastName: e.lastName,
    email: e.email,
    phone: e.phone,
    departmentName: e.department.name,
    designationTitle: e.designation.title,
    status: e.status,
    joiningDate: e.joiningDate,
  }));

  return paginated(data, { page, limit, total });
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("employees.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = createEmployeeSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.employee.findFirst({ where: { email: parsed.data.email, deletedAt: null } });
  if (existing) return failure("An employee with this email already exists", 409);

  const employeeCode = await generateEmployeeCode();

  const employee = await prisma.employee.create({
    data: { ...parsed.data, employeeCode, createdById: guard.payload!.sub },
  });

  await logAudit({
    userId: guard.payload!.sub,
    action: "CREATE",
    entityType: "Employee",
    entityId: employee.id,
    newValues: { employeeCode, firstName: employee.firstName, lastName: employee.lastName },
    ipAddress,
    userAgent,
  });
  await logActivity({
    userId: guard.payload!.sub,
    type: "SYSTEM",
    description: `New employee registered: ${employee.firstName} ${employee.lastName} (${employeeCode})`,
  });

  return created({ id: employee.id, employeeCode: employee.employeeCode });
}
