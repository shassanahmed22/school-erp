import { z } from "zod";

const inventoryUnitEnum = z.enum(["PCS", "BOX", "PACKET", "KG", "LITRE", "SET", "REAM", "OTHER"]);
const inventoryItemStatusEnum = z.enum(["ACTIVE", "DISCONTINUED"]);

export const createInventoryItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  sku: z.string().optional(),
  categoryId: z.string().uuid("A valid category is required"),
  unit: inventoryUnitEnum.default("PCS"),
  quantity: z.coerce.number().int().min(0, "Quantity cannot be negative").default(0),
  reorderLevel: z.coerce.number().int().min(0, "Reorder level cannot be negative").default(0),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative").default(0),
  supplier: z.string().optional(),
  location: z.string().optional(),
  status: inventoryItemStatusEnum.default("ACTIVE"),
});

export const updateInventoryItemSchema = createInventoryItemSchema.partial().omit({ quantity: true });

export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
