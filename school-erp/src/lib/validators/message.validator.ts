import { z } from "zod";

export const createMessageSchema = z.object({
  recipientId: z.string().uuid("A valid recipient is required"),
  subject: z.string().min(1, "Subject is required").max(200, "Subject is too long"),
  content: z.string().min(1, "Message content cannot be empty"),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
