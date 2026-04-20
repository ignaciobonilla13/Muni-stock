import { env } from "./config/env";
import { connectDb } from "./config/db";
import { app } from "./app";

async function main() {
  await connectDb();

  app.listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

