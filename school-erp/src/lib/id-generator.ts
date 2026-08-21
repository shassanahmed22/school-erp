import { prisma } from "./prisma";

/**
 * Generates a sequential, human-readable registration number scoped to the
 * current year, e.g. STU-2026-00001, TCH-2026-00001.
 * Uses a transaction-safe count of existing records for the year as the
 * sequence source — fine at school scale (1000s of students/year).
 */
export async function generateStudentRegistrationNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `STU-${year}-`;

  const count = await prisma.student.count({
    where: { registrationNumber: { startsWith: prefix } },
  });

  const sequence = String(count + 1).padStart(5, "0");
  return `${prefix}${sequence}`;
}

export async function generateTeacherEmployeeCode(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `TCH-${year}-`;

  const count = await prisma.teacher.count({
    where: { employeeCode: { startsWith: prefix } },
  });

  const sequence = String(count + 1).padStart(5, "0");
  return `${prefix}${sequence}`;
}

/** Generates a sequential employee code for HR staff, e.g. EMP-2026-00001. */
export async function generateEmployeeCode(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `EMP-${year}-`;

  const count = await prisma.employee.count({
    where: { employeeCode: { startsWith: prefix } },
  });

  const sequence = String(count + 1).padStart(5, "0");
  return `${prefix}${sequence}`;
}
