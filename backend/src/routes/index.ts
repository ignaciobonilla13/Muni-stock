import { Router } from "express";

import { authRouter } from "./auth.routes";
import { productsRouter } from "./products.routes";
import { inventoryRouter } from "./inventory.routes";
import { stockMovementsRouter } from "./stockMovements.routes";

export const router = Router();

router.use("/auth", authRouter);
router.use("/products", productsRouter);
router.use("/inventory", inventoryRouter);
router.use("/stock-movements", stockMovementsRouter);

