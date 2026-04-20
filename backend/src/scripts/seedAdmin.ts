import bcrypt from "bcrypt";
import { env } from "../config/env";
import { connectDb } from "../config/db";
import { User } from "../models/User";

async function run() {
  await connectDb();

  const existing = await User.findOne({ email: env.SEED_ADMIN_EMAIL });
  if (existing) {
    console.log("Admin already exists:", existing.email);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 10);

  const user = await User.create({
    email: env.SEED_ADMIN_EMAIL,
    passwordHash,
    role: env.SEED_ADMIN_ROLE,
  });

  console.log("Seed admin created:", user.email);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

