import { Router } from "express";

import { authenticate } from "../middleware/auth";
import * as inventoryController from "../controllers/inventoryController";

export const inventoryRouter = Router();

inventoryRouter.get("/", authenticate, inventoryController.getInventory);

