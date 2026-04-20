import { Request, Response } from "express";

import { Product } from "../models/Product";
import { Inventory } from "../models/Inventory";

export async function getInventory(req: Request, res: Response) {
  const productIdRaw = req.query.productId;
  const productId = typeof productIdRaw === "string" && productIdRaw.trim() ? productIdRaw.trim() : null;

  const productFilter = productId ? { _id: productId } : {};
  const products = await Product.find(productFilter).sort({ createdAt: -1 });

  if (products.length === 0) {
    return res.json({ inventory: [] });
  }

  const invDocs = await Inventory.find({
    productId: { $in: products.map((p) => p._id) },
  });

  const invMap = new Map<string, number>();
  for (const inv of invDocs) {
    invMap.set(inv.productId.toString(), inv.qtyOnHand);
  }

  const inventory = products.map((p) => ({
    productId: p._id.toString(),
    name: p.name,
    sku: p.sku,
    qtyOnHand: invMap.get(p._id.toString()) ?? 0,
  }));

  return res.json({ inventory });
}

