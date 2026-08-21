import { z } from "zod";

export const recordPaymentSchema = z.object({
  studentFeeId: z.string().uuid(),
  amountPaid: z.coerce.number().min(0.01, "Payment amount must be greater than 0"),
  paymentDate: z.coerce.date().default(() => new Date()),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CARD", "CHEQUE", "ONLINE", "OTHER"]).default("CASH"),
  referenceNumber: z.string().optional(),
  remarks: z.string().optional(),
});

export const paymentQuerySchema = z.object({
  studentFeeId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CARD", "CHEQUE", "ONLINE", "OTHER"]).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(200).default(20),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
