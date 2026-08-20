import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { issueBookSchema, bookIssueQuerySchema } from "@/lib/validators/book-issue.validator";
import { markOverdueIssues } from "@/lib/library-service";
import { paginated, created, unauthorized, failure } from "@/lib/api-response";
import { logAudit, logActivity, getRequestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const payload = await getCurrentUserFromCookies();
  if (!payload) return unauthorized();

  const { searchParams } = new URL(req.url);
  const parsed = bookIssueQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return failure("Invalid query parameters", 422, parsed.error.flatten());

  await markOverdueIssues();

  const { bookId, status, search, page, limit } = parsed.data;
  let { studentId } = parsed.data;

  if (hasRole(payload, "student") && !hasRole(payload, "super-admin")) {
    const student = await prisma.student.findUnique({ where: { userId: payload.sub } });
    if (!student) return paginated([], { page, limit, total: 0 });
    studentId = student.id;
  } else {
    const guard = await requirePermission("books.view");
    if (guard.error) return guard.error;
  }

  const where = {
    ...(bookId && { bookId }),
    ...(studentId && { studentId }),
    ...(status && { status }),
    ...(search && {
      OR: [
        { book: { title: { contains: search, mode: "insensitive" as const } } },
        { student: { firstName: { contains: search, mode: "insensitive" as const } } },
        { student: { lastName: { contains: search, mode: "insensitive" as const } } },
        { student: { registrationNumber: { contains: search, mode: "insensitive" as const } } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.bookIssue.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { issueDate: "desc" },
      include: { book: { select: { title: true } }, student: { select: { firstName: true, lastName: true, registrationNumber: true } } },
    }),
    prisma.bookIssue.count({ where }),
  ]);

  const data = items.map((i) => ({
    id: i.id,
    bookId: i.bookId,
    bookTitle: i.book.title,
    studentId: i.studentId,
    studentName: `${i.student.firstName} ${i.student.lastName}`,
    registrationNumber: i.student.registrationNumber,
    issueDate: i.issueDate,
    dueDate: i.dueDate,
    returnDate: i.returnDate,
    fineAmount: Number(i.fineAmount),
    finePaid: i.finePaid,
    status: i.status,
  }));

  return paginated(data, { page, limit, total });
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission("books.create");
  if (guard.error) return guard.error;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const body = await req.json();
  const parsed = issueBookSchema.safeParse(body);
  if (!parsed.success) return failure("Validation failed", 422, parsed.error.flatten());

  const { bookId, studentId, dueDate } = parsed.data;

  const book = await prisma.book.findFirst({ where: { id: bookId, deletedAt: null } });
  if (!book) return failure("Book not found", 404);
  if (book.availableQuantity <= 0) return failure("No copies of this book are currently available", 409);

  const student = await prisma.student.findFirst({ where: { id: studentId, deletedAt: null } });
  if (!student) return failure("Student not found", 404);

  const existingActive = await prisma.bookIssue.findFirst({
    where: { bookId, studentId, status: { in: ["ISSUED", "OVERDUE"] } },
  });
  if (existingActive) return failure("This student already has an active issue for this book", 409);

  const issue = await prisma.$transaction(async (tx) => {
    const newIssue = await tx.bookIssue.create({
      data: { bookId, studentId, dueDate, issuedById: guard.payload!.sub },
    });
    await tx.book.update({ where: { id: bookId }, data: { availableQuantity: { decrement: 1 } } });
    return newIssue;
  });

  await logAudit({
    userId: guard.payload!.sub,
    action: "CREATE",
    entityType: "BookIssue",
    entityId: issue.id,
    newValues: { bookId, studentId, dueDate },
    ipAddress,
    userAgent,
  });
  await logActivity({
    userId: guard.payload!.sub,
    type: "LIBRARY",
    description: `Issued "${book.title}" to ${student.firstName} ${student.lastName}`,
  });

  return created(issue);
}
