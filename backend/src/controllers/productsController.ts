import { Request, Response } from "express";

import { Product } from "../models/Product";
import { Inventory } from "../models/Inventory";

export async function createProduct(req: Request, res: Response) {
  const { name, description, unitCost, supplier, invoiceNumber } = req.body ?? {};

  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ message: "Field `name` is required" });
  }

  const product = await Product.create({
    name: name.trim(),
    description: typeof description === "string" ? description.trim() : undefined,
    unitCost: typeof unitCost === "number" ? unitCost : undefined,
    supplier: typeof supplier === "string" ? supplier.trim() : undefined,
    invoiceNumber: typeof invoiceNumber === "string" ? invoiceNumber.trim() : undefined,
  });

  await Inventory.create({ productId: product._id, qtyOnHand: 0 });

  return res.status(201).json({ product });
}

export async function listProducts(_req: Request, res: Response) {
  const products = await Product.find({}).sort({ createdAt: -1 });
  return res.json({
    products: products.map((p) => ({
      _id: p._id.toString(),
      name: p.name,
      description: p.description,
      unitCost: p.unitCost,
      supplier: p.supplier,
      invoiceNumber: p.invoiceNumber,
    })),
  });
}

export async function updateProduct(req: Request, res: Response) {
  const { id } = req.params;
  const { name, description, unitCost, supplier, invoiceNumber } = req.body ?? {};

  if (typeof name === "string" && !name.trim()) {
    return res.status(400).json({ message: "`name` no puede ser vacío" });
  }

  const product = await Product.findByIdAndUpdate(
    id,
    {
      ...(typeof name === "string" ? { name: name.trim() } : {}),
      ...(typeof description === "string" ? { description: description.trim() || undefined } : {}),
      ...(typeof unitCost === "number" ? { unitCost } : {}),
      ...(typeof supplier === "string" ? { supplier: supplier.trim() || undefined } : {}),
      ...(typeof invoiceNumber === "string" ? { invoiceNumber: invoiceNumber.trim() || undefined } : {}),
    },
    { new: true }
  );

  if (!product) return res.status(404).json({ message: "Product not found" });

  return res.json({
    product: {
      _id: product._id.toString(),
      name: product.name,
      description: product.description,
      unitCost: product.unitCost,
      supplier: product.supplier,
      invoiceNumber: product.invoiceNumber,
    },
  });
}

export async function deleteProduct(req: Request, res: Response) {
  const { id } = req.params;

  const product = await Product.findByIdAndDelete(id);
  if (!product) return res.status(404).json({ message: "Product not found" });

  await Inventory.deleteOne({ productId: id });

  return res.json({ message: "Product deleted", id });
}