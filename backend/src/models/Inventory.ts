import { Schema, model, Types } from "mongoose";

export type InventoryDoc = {
  productId: Types.ObjectId;
  qtyOnHand: number;
};

const InventorySchema = new Schema<InventoryDoc>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", unique: true, required: true },
    qtyOnHand: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true }
);

export const Inventory = model("Inventory", InventorySchema);

