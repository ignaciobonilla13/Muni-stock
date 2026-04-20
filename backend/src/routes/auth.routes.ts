import { Router } from "express";

import { authenticate } from "../middleware/auth";
import * as authController from "../controllers/authController";

export const authRouter = Router();

// Auth
authRouter.post("/login", authController.login);
authRouter.get("/me", authenticate, authController.me);

