import { Schema, model, Types } from "mongoose";

export type StockMovementType = "IN" | "OUT";

export type StockMovementDoc = {
  productId: Types.ObjectId;
  type: StockMovementType;
  quantity: number;
  unitCost?: number;
  occurredAt: Date;
  reference?: string;
  createdBy: Types.ObjectId;
};

const StockMovementSchema = new Schema<StockMovementDoc>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    type: { type: String, enum: ["IN", "OUT"], required: true, index: true },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, min: 0, required: false },
    occurredAt: { type: Date, required: true, default: () => new Date() },
    reference: { type: String, required: false, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

StockMovementSchema.index({ productId: 1, occurredAt: -1 });

export const StockMovement = model("StockMovement", StockMovementSchema);

