import mongoose, { Schema, model } from "mongoose";

export type ProductDoc = {
  name: string;
  sku?: string;
  unitCost?: number;
};

const ProductSchema = new Schema<ProductDoc>(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: false, trim: true, unique: true, sparse: true },
    unitCost: { type: Number, required: false, min: 0 },
  },
  { timestamps: true }
);

ProductSchema.index({ sku: 1 }, { unique: true, sparse: true });

export const Product = model("Product", ProductSchema);

