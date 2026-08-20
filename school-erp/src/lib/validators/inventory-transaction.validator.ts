import { z } from "zod";

const inventoryTransactionTypeEnum = z.enum(["STOCK_IN", "STOCK_OUT", "ADJUSTMENT"]);

export const createInventoryTransactionSchema = z.object({
  itemId: z.string().uuid("A valid item is required"),
  type: inventoryTransactionTypeEnum,
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  reason: z.string().optional(),
});

export type CreateInventoryTransactionInput = z.infer<typeof createInventoryTransactionSchema>;
