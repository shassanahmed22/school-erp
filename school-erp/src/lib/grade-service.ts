import { prisma } from "./prisma";

/**
 * Standard grading scale. Adjust here to change grading school-wide —
 * every result computation flows through this single table.
 */
const GRADE_SCALE: { min: number; grade: string; gpa: number }[] = [
  { min: 90, grade: "A+", gpa: 4.0 },
  { min: 80, grade: "A", gpa: 3.7 },
  { min: 70, grade: "B+", gpa: 3.3 },
  { min: 60, grade: "B", gpa: 3.0 },
  { min: 50, grade: "C+", gpa: 2.7 },
  { min: 40, grade: "C", gpa: 2.3 },
  { min: 33, grade: "D", gpa: 1.0 },
  { min: 0, grade: "F", gpa: 0.0 },
];

export function calculateGrade(percentage: number): { grade: string; gpa: number } {
  const band = GRADE_SCALE.find((b) => percentage >= b.min) ?? GRADE_SCALE[GRADE_SCALE.length - 1];
  return { grade: band.grade, gpa: band.gpa };
}

export function calculatePercentage(obtainedMarks: number, totalMarks: number): number {
  if (totalMarks <= 0) return 0;
  return Math.round((obtainedMarks / totalMarks) * 10000) / 100;
}

/**
 * Computes a student's result for one exam from raw subject marks, persists it
 * (StudentResult + SubjectMarks), and returns the computed record. Does NOT
 * publish the result — call publishExamResults() separately once verified.
 */
export async function computeStudentResult(params: {
  examId: string;
  studentId: string;
  marks: { examSubjectId: string; obtainedMarks: number; isAbsent?: boolean }[];
  computedById: string;
}) {
  const { examId, studentId, marks, computedById } = params;

  const examSubjects = await prisma.examSubject.findMany({ where: { examId } });
  const examSubjectMap = new Map(examSubjects.map((es) => [es.id, es]));

  let totalMarks = 0;
  let obtainedMarks = 0;
  const subjectMarksData = marks.map((m) => {
    const es = examSubjectMap.get(m.examSubjectId);
    if (!es) throw new Error(`Exam subject ${m.examSubjectId} does not belong to this exam`);
    totalMarks += es.totalMarks;
    const scored = m.isAbsent ? 0 : m.obtainedMarks;
    obtainedMarks += scored;
    const { grade } = calculateGrade(calculatePercentage(scored, es.totalMarks));
    return { examSubjectId: m.examSubjectId, obtainedMarks: scored, grade, isAbsent: m.isAbsent ?? false };
  });

  const percentage = calculatePercentage(obtainedMarks, totalMarks);
  const { grade, gpa } = calculateGrade(percentage);

  const result = await prisma.$transaction(async (tx) => {
    const r = await tx.studentResult.upsert({
      where: { studentId_examId: { studentId, examId } },
      update: { totalMarks, obtainedMarks, percentage, grade, gpa, computedById, status: "DRAFT" },
      create: { studentId, examId, totalMarks, obtainedMarks, percentage, grade, gpa, computedById, status: "DRAFT" },
    });

    await tx.subjectMarks.deleteMany({ where: { resultId: r.id } });
    await tx.subjectMarks.createMany({
      data: subjectMarksData.map((sm) => ({ ...sm, resultId: r.id })),
    });

    return r;
  });

  return result;
}

/** Recomputes 1-based rank/position for every published-or-draft result within an exam. */
export async function computeExamRankings(examId: string) {
  const results = await prisma.studentResult.findMany({
    where: { examId },
    orderBy: { obtainedMarks: "desc" },
  });

  await prisma.$transaction(
    results.map((r, index) =>
      prisma.studentResult.update({ where: { id: r.id }, data: { position: index + 1 } })
    )
  );

  return results.length;
}

/** Publishes all DRAFT results for an exam, making them visible to students/parents. */
export async function publishExamResults(examId: string) {
  await computeExamRankings(examId);
  const { count } = await prisma.studentResult.updateMany({
    where: { examId, status: "DRAFT" },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  await prisma.exam.update({ where: { id: examId }, data: { status: "RESULT_PUBLISHED" } });
  return count;
}

export async function unpublishExamResults(examId: string) {
  const { count } = await prisma.studentResult.updateMany({
    where: { examId, status: "PUBLISHED" },
    data: { status: "DRAFT", publishedAt: null },
  });
  return count;
}
