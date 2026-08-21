import { z } from "zod";

const eventTypeEnum = z.enum(["HOLIDAY", "EXAM", "MEETING", "FUNCTION", "SPORTS", "OTHER"]);
const eventAudienceEnum = z.enum(["ALL", "STUDENTS", "PARENTS", "TEACHERS", "STAFF"]);

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createEventSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200, "Title is too long"),
    description: z.string().optional(),
    type: eventTypeEnum.default("OTHER"),
    audience: eventAudienceEnum.default("ALL"),
    startDate: z.coerce.date({ required_error: "Start date is required" }),
    endDate: z.coerce.date({ required_error: "End date is required" }),
    isAllDay: z.boolean().default(true),
    startTime: z.string().regex(timeRegex, "Start time must be in HH:MM format").optional(),
    endTime: z.string().regex(timeRegex, "End time must be in HH:MM format").optional(),
    location: z.string().optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date cannot be before the start date",
    path: ["endDate"],
  });

export const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  type: eventTypeEnum.optional(),
  audience: eventAudienceEnum.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  isAllDay: z.boolean().optional(),
  startTime: z.string().regex(timeRegex).optional().nullable(),
  endTime: z.string().regex(timeRegex).optional().nullable(),
  location: z.string().optional().nullable(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
