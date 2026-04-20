import { Router } from "express";

import { authenticate, authorize } from "../middleware/auth";
import * as productsController from "../controllers/productsController";

export const productsRouter = Router();

productsRouter.post("/", authenticate, authorize(["admin"]), productsController.createProduct);
productsRouter.get("/", authenticate, productsController.listProducts);
productsRouter.patch("/:id", authenticate, authorize(["admin"]), productsController.updateProduct);
productsRouter.delete("/:id", authenticate, authorize(["admin"]), productsController.deleteProduct);