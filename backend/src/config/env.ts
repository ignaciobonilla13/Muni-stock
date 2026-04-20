import dotenv from "dotenv";

dotenv.config();

function mustGet(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

export const env = {
  PORT: Number(process.env.PORT ?? 5000),
  MONGODB_URI: mustGet("MONGODB_URI"),
  JWT_SECRET: mustGet("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "1h",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:5173",

  SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD ?? "admin123",
  SEED_ADMIN_ROLE: (process.env.SEED_ADMIN_ROLE ?? "admin") as "admin" | "operator",
};

