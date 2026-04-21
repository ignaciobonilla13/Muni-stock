import { Schema, model } from "mongoose";

export type ProductDoc = {
  name: string;
  description?: string;
  unitCost?: number;
  supplier?: string;
  invoiceNumber?: string;
};

const ProductSchema = new Schema<ProductDoc>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: false, trim: true },
    unitCost: { type: Number, required: false, min: 0 },
    supplier: { type: String, required: false, trim: true },
    invoiceNumber: { type: String, required: false, trim: true },
  },
  { timestamps: true }
);

export const Product = model<ProductDoc>("Product", ProductSchema);