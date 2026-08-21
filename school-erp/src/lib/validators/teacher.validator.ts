import { z } from "zod";

const genderEnum = z.enum(["MALE", "FEMALE", "OTHER"]);
const bloodGroupEnum = z.enum(["A_POS", "A_NEG", "B_POS", "B_NEG", "AB_POS", "AB_NEG", "O_POS", "O_NEG", "UNKNOWN"]);
const teacherStatusEnum = z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE", "RESIGNED", "TERMINATED"]);

export const qualificationSchema = z.object({
  degreeTitle: z.string().min(1, "Degree title is required"),
  institution: z.string().min(1, "Institution is required"),
  yearCompleted: z.coerce.number().min(1950).max(new Date().getFullYear()),
  grade: z.string().optional(),
});

export const createTeacherSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().optional(),
  designation: z.string().optional(),
  dateOfBirth: z.coerce.date().optional(),
  gender: genderEnum.optional(),
  bloodGroup: bloodGroupEnum.optional(),
  nationality: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  photoUrl: z.string().optional(),
  cnic: z.string().optional(),
  experienceYears: z.coerce.number().min(0).optional(),
  specialization: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),

  qualifications: z.array(qualificationSchema).default([]),
  subjectIds: z.array(z.string().uuid()).default([]),

  status: teacherStatusEnum.default("ACTIVE"),
});

export const updateTeacherSchema = createTeacherSchema.partial();

export const teacherQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  status: teacherStatusEnum.optional(),
  subjectId: z.string().uuid().optional(),
});

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;
