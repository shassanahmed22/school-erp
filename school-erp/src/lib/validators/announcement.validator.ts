import { z } from "zod";

const announcementAudienceEnum = z.enum(["ALL", "STUDENTS", "PARENTS", "TEACHERS", "STAFF"]);

export const createAnnouncementSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  content: z.string().min(1, "Content is required"),
  audience: announcementAudienceEnum.default("ALL"),
  isPinned: z.boolean().default(false),
  expiresAt: z.coerce.date().optional(),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial();

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
