import express from "express";
import { env } from "./lib/env";
import { createCorsMiddleware } from "./middleware/cors";
import { logger } from "./lib/logger";

const app = express();
// WHY: Parse JSON bodies early so route handlers can trust req.body.
app.use(express.json());
// WHY: Enforce browser-origin access rules. We allow localhost + Vercel previews/prod.
app.use(createCorsMiddleware());

// WHY: /health is used by load balancers, uptime checks, and our FE warm-up UX.
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Routes
import walletsRouter from "./routes/wallets";
app.use("/api", walletsRouter);

// WHY: Bind to PORT from env (12-factor). Render injects PORT in prod.
app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "server listening");
});

