import { z } from "zod";

const genderEnum = z.enum(["MALE", "FEMALE", "OTHER"]);
const bloodGroupEnum = z.enum(["A_POS", "A_NEG", "B_POS", "B_NEG", "AB_POS", "AB_NEG", "O_POS", "O_NEG", "UNKNOWN"]);
const studentStatusEnum = z.enum(["ACTIVE", "INACTIVE", "GRADUATED", "SUSPENDED", "EXPELLED", "TRANSFERRED"]);
const guardianRelationEnum = z.enum([
  "FATHER", "MOTHER", "BROTHER", "SISTER", "UNCLE", "AUNT",
  "GRANDFATHER", "GRANDMOTHER", "LEGAL_GUARDIAN", "OTHER",
]);

export const guardianSchema = z.object({
  relation: guardianRelationEnum,
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  phone: z.string().min(7, "Enter a valid phone number"),
  email: z.string().email().optional().or(z.literal("")),
  occupation: z.string().optional(),
  cnic: z.string().optional(),
  address: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

export const createStudentSchema = z.object({
  // Personal
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  dateOfBirth: z.coerce.date({ required_error: "Date of birth is required" }),
  gender: genderEnum,
  bloodGroup: bloodGroupEnum.optional(),
  nationality: z.string().optional(),
  religion: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  photoUrl: z.string().optional(),

  // Emergency contact
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),

  // Previous school
  previousSchoolName: z.string().optional(),
  previousSchoolAddress: z.string().optional(),
  previousGrade: z.string().optional(),

  medicalNotes: z.string().optional(),

  // Enrollment (optional at creation time)
  sectionId: z.string().uuid().optional(),
  academicYearId: z.string().uuid().optional(),
  rollNumber: z.string().optional(),

  // Guardians
  guardians: z.array(guardianSchema).min(1, "At least one guardian is required"),

  status: studentStatusEnum.default("ACTIVE"),
});

export const updateStudentSchema = createStudentSchema.partial().extend({
  guardians: z.array(guardianSchema).optional(),
});

export const updateStudentStatusSchema = z.object({
  status: studentStatusEnum,
  remarks: z.string().optional(),
});

export const studentQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  status: studentStatusEnum.optional(),
  sectionId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type GuardianInput = z.infer<typeof guardianSchema>;
