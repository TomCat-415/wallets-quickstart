import express from "express";
import { env } from "./lib/env";
import { createCorsMiddleware } from "./middleware/cors";
import { logger } from "./lib/logger";

const app = express();
app.use(express.json());
app.use(createCorsMiddleware());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Routes
import walletsRouter from "./routes/wallets";
app.use("/api", walletsRouter);

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "server listening");
});

