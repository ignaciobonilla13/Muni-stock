import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { Request, Response } from "express";

import { env } from "../config/env";
import { User } from "../models/User";

export async function login(req: Request, res: Response) {
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ message: "Email y password son requeridos" });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+passwordHash");
  if (!user) return res.status(401).json({ message: "Credenciales inválidas" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Credenciales inválidas" });

  const token = jwt.sign(
    { sub: user._id.toString(), role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] }
  );

  return res.json({ token });
}

export async function me(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ message: "Missing auth user" });

  const user = await User.findById(req.user.id).select("email role");
  if (!user) return res.status(401).json({ message: "User not found" });

  return res.json({
    user: {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    },
  });
}