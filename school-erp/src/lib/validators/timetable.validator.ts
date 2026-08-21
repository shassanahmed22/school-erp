import { z } from "zod";

const dayOfWeekEnum = z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]);

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createTimetablePeriodSchema = z
  .object({
    sectionId: z.string().uuid("A valid section is required"),
    subjectId: z.string().uuid("A valid subject is required"),
    teacherId: z.string().uuid().optional(),
    dayOfWeek: dayOfWeekEnum,
    periodNumber: z.coerce.number().int().min(1, "Period number must be at least 1").max(12, "Period number is too high"),
    startTime: z.string().regex(timeRegex, "Start time must be in HH:MM format"),
    endTime: z.string().regex(timeRegex, "End time must be in HH:MM format"),
    roomNumber: z.string().optional(),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export const updateTimetablePeriodSchema = z.object({
  sectionId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
  teacherId: z.string().uuid().optional().nullable(),
  dayOfWeek: dayOfWeekEnum.optional(),
  periodNumber: z.coerce.number().int().min(1).max(12).optional(),
  startTime: z.string().regex(timeRegex).optional(),
  endTime: z.string().regex(timeRegex).optional(),
  roomNumber: z.string().optional().nullable(),
});

export type CreateTimetablePeriodInput = z.infer<typeof createTimetablePeriodSchema>;
