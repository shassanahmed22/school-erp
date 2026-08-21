import { z } from "zod";

const assignmentStatusEnum = z.enum(["DRAFT", "PUBLISHED", "CLOSED"]);

export const createAssignmentSchema = z.object({
  sectionId: z.string().uuid("A valid section is required"),
  subjectId: z.string().uuid("A valid subject is required"),
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().min(1, "Description is required"),
  attachmentUrl: z.string().url().optional().or(z.literal("")),
  maxMarks: z.coerce.number().int().min(1).optional(),
  dueDate: z.coerce.date({ required_error: "Due date is required" }),
  status: assignmentStatusEnum.default("PUBLISHED"),
});

export const updateAssignmentSchema = createAssignmentSchema.partial();

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
