import { Request, Response } from "express";
import mongoose from "mongoose";

import { Inventory } from "../models/Inventory";
import { Product } from "../models/Product";
import { StockMovement } from "../models/StockMovement";

function parseDateParam(raw: unknown, mode: "start" | "end"): Date | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  if (!v) return null;

  // Si viene como YYYY-MM-DD, lo convertimos a rango UTC.
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const t = mode === "start" ? "T00:00:00.000Z" : "T23:59:59.999Z";
    return new Date(v + t);
  }

  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function listStockMovements(req: Request, res: Response) {
  const productIdRaw = req.query.productId;
  const productId = typeof productIdRaw === "string" && productIdRaw.trim() ? productIdRaw.trim() : null;

  const from = parseDateParam(req.query.from, "start");
  const to = parseDateParam(req.query.to, "end");

  const filter: Record<string, unknown> = {};
  if (productId) {
    filter.productId = productId;
  }
  if (from || to) {
    filter.occurredAt = {
      ...(from ? { $gte: from } : {}),
      ...(to ? { $lte: to } : {}),
    };
  }

  const movements = await StockMovement.find(filter)
    .sort({ occurredAt: -1 })
    .limit(500);

  return res.json({
    movements: movements.map((m) => ({
      _id: m._id.toString(),
      productId: m.productId.toString(),
      type: m.type,
      quantity: m.quantity,
      occurredAt: m.occurredAt.toISOString(),
      unitCost: m.unitCost,
      reference: m.reference,
    })),
  });
}

class BadRequestError extends Error {
  status = 400;
}

function parseQuantity(value: unknown): number | null {
  if (typeof value === "number") return Number.isInteger(value) && value > 0 ? value : null;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isInteger(n) && n > 0) return n;
  }
  return null;
}

export async function createStockMovement(req: Request, res: Response) {
  const { productId, type, quantity, unitCost, reference, occurredAt } = req.body ?? {};

  if (typeof type !== "string" || (type !== "IN" && type !== "OUT")) {
    return res.status(400).json({ message: "Field `type` must be `IN` or `OUT`" });
  }

  if (typeof productId !== "string" || !mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: "Field `productId` is invalid" });
  }

  const qty = parseQuantity(quantity);
  if (qty == null) return res.status(400).json({ message: "Field `quantity` must be an integer > 0" });

  let cost: number | undefined;
  if (unitCost != null) {
    const n = typeof unitCost === "number" ? unitCost : Number(unitCost);
    if (!Number.isFinite(n) || n < 0) return res.status(400).json({ message: "Field `unitCost` inválido" });
    cost = n;
  }

  let occurredAtDate: Date;
  if (occurredAt != null) {
    const d = new Date(String(occurredAt));
    if (Number.isNaN(d.getTime())) return res.status(400).json({ message: "Field `occurredAt` inválido" });
    occurredAtDate = d;
  } else {
    occurredAtDate = new Date();
  }

  const refStr = typeof reference === "string" && reference.trim() ? reference.trim() : undefined;

  if (!req.user) return res.status(401).json({ message: "Missing auth user" });

  const pid = new mongoose.Types.ObjectId(productId);
  const createdBy = new mongoose.Types.ObjectId(req.user.id);

  const session = await mongoose.startSession();
  try {
    let movementDoc: any = null;
    let newQty = 0;

    await session.withTransaction(async () => {
      const productExists = await Product.exists({ _id: pid }).session(session);
      if (!productExists) throw new BadRequestError("Product not found");

      let inv = await Inventory.findOne({ productId: pid }).session(session);
      if (!inv) {
        if (type === "OUT") throw new BadRequestError("Stock insuficiente");
        inv = await Inventory.create([{ productId: pid, qtyOnHand: 0 }], { session }).then((docs) => docs[0]);
      }

      if (type === "OUT" && inv.qtyOnHand < qty) {
        throw new BadRequestError("Stock insuficiente");
      }

      const delta = type === "IN" ? qty : -qty;
      await Inventory.updateOne({ _id: inv._id }, { $inc: { qtyOnHand: delta } }, { session });

      const updatedInv = await Inventory.findById(inv._id).session(session);
      if (!updatedInv) throw new BadRequestError("Failed to update inventory");
      newQty = updatedInv.qtyOnHand;

      movementDoc = await StockMovement.create(
        [
          {
            productId: pid,
            type,
            quantity: qty,
            unitCost: cost,
            occurredAt: occurredAtDate,
            reference: refStr,
            createdBy,
          },
        ],
        { session }
      ).then((docs) => docs[0]);
    });

    return res.status(201).json({
      movement: {
        _id: movementDoc?._id?.toString?.() ?? null,
        productId,
        type,
        quantity: qty,
        unitCost: cost,
        occurredAt: occurredAtDate.toISOString(),
        reference: refStr,
        createdBy: req.user.id,
      },
      inventory: {
        productId,
        qtyOnHand: newQty,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    const status = err && typeof (err as any).status === "number" ? (err as any).status : 500;
    return res.status(status).json({ message: msg });
  } finally {
    session.endSession();
  }
}

