import { Router } from "express";

import { authenticate } from "../middleware/auth";
import * as stockMovementsController from "../controllers/stockMovementsController";

export const stockMovementsRouter = Router();

// POST /api/stock-movements se implementa en el siguiente to-do (actualización consistente).
stockMovementsRouter.post("/", authenticate, stockMovementsController.createStockMovement);
stockMovementsRouter.get("/", authenticate, stockMovementsController.listStockMovements);

