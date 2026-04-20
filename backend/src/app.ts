import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env";
import { router } from "./routes";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
  })
);
app.use(morgan("dev"));
app.use(express.json());

app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

app.use("/api", router);

// Basic error handler
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

export { app };

