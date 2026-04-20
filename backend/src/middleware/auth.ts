import jwt, { JwtPayload } from "jsonwebtoken";
import { env } from "../config/env";
import { UserRole } from "../models/User";
import { Request, Response, NextFunction } from "express";

type AuthUser = { id: string; role: UserRole };

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function parseBearer(tokenHeader: string | undefined) {
  if (!tokenHeader) return null;
  const [scheme, token] = tokenHeader.split(" ");
  if (!token || scheme.toLowerCase() !== "bearer") return null;
  return token;
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = parseBearer(req.headers.authorization);
  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload & { sub?: string; role?: UserRole };
    if (!payload.sub || !payload.role) return res.status(401).json({ message: "Invalid token" });
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (_err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export function authorize(roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: "Missing auth user" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}

