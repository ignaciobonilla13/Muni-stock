import { Request, Response } from "express";

import { Product } from "../models/Product";
import { Inventory } from "../models/Inventory";

export async function createProduct(req: Request, res: Response) {
  const { name, sku, unitCost } = req.body ?? {};

  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ message: "Field `name` is required" });
  }

  const product = await Product.create({
    name: name.trim(),
    sku: typeof sku === "string" ? sku.trim() : undefined,
    unitCost: typeof unitCost === "number" ? unitCost : undefined,
  });

  // Cada producto arranca con inventario en 0.
  await Inventory.create({ productId: product._id, qtyOnHand: 0 });

  return res.status(201).json({ product });
}

export async function listProducts(_req: Request, res: Response) {
  const products = await Product.find({}).sort({ createdAt: -1 });
  return res.json({
    products: products.map((p) => ({
      _id: p._id.toString(),
      name: p.name,
      sku: p.sku,
      unitCost: p.unitCost,
    })),
  });
}

export async function updateProduct(req: Request, res: Response) {
  const { id } = req.params;
  const { name, sku, unitCost } = req.body ?? {};

  if (typeof name === "string" && !name.trim()) {
    return res.status(400).json({ message: "`name` no puede ser vacío" });
  }

  const product = await Product.findByIdAndUpdate(
    id,
    {
      ...(typeof name === "string" ? { name: name.trim() } : {}),
      ...(typeof sku === "string" ? { sku: sku.trim() || undefined } : {}),
      ...(typeof unitCost === "number" ? { unitCost } : {}),
    },
    { new: true }
  );

  if (!product) return res.status(404).json({ message: "Product not found" });

  return res.json({
    product: {
      _id: product._id.toString(),
      name: product.name,
      sku: product.sku,
      unitCost: product.unitCost,
    },
  });
}

export async function deleteProduct(req: Request, res: Response) {
  const { id } = req.params;

  const product = await Product.findByIdAndDelete(id);
  if (!product) return res.status(404).json({ message: "Product not found" });

  // Limpiamos el inventario asociado para no dejar datos huérfanos.
  await Inventory.deleteOne({ productId: id });

  return res.json({ message: "Product deleted", id });
}