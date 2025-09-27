import { Router } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";
import { appendRecord } from "../lib/records";
import { createWallet } from "../lib/crossmint";
import { env } from "../lib/env";

const router = Router();

function getCorrelationId(req: any): string {
  return (req.headers["x-correlation-id"] as string) || cryptoRandom();
}

function cryptoRandom(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// POST /api/wallets
router.post("/wallets", async (req, res) => {
  const started = Date.now();
  const correlationId = getCorrelationId(req);
  const schema = z.object({
    identifierType: z.enum(["email", "userId"]),
    identifier: z.string().min(1),
    chain: z.string().optional(),
    label: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    const error = { code: "VALIDATION_ERROR", message: "Invalid body", details: parsed.error.flatten(), correlationId };
    logger.warn({ route: "POST /api/wallets", correlationId, error, durationMs: Date.now() - started }, "validation error");
    return res.status(422).json(error);
  }

  try {
    const idempotencyKey = (req.headers["idempotency-key"] as string) || undefined;
    const data = await createWallet(parsed.data, idempotencyKey);
    const response = {
      walletId: data.id || data.walletId || data.wallet?.id,
      address: data.address || data.wallet?.address,
      chain: env.CHAIN,
      linkedUser: { type: parsed.data.identifierType, value: parsed.data.identifier },
      createdAt: new Date().toISOString(),
    };

    logger.info({ route: "POST /api/wallets", correlationId, operation: "createWallet", outcome: "success", durationMs: Date.now() - started }, "wallet created");
    appendRecord({
      ts: new Date().toISOString(),
      correlationId,
      operation: "createWallet",
      identifier: `${parsed.data.identifierType}:${parsed.data.identifier}`,
      walletId: response.walletId,
      address: response.address,
      status: "success",
    });
    res.setHeader("X-Correlation-Id", correlationId);
    return res.status(201).json(response);
  } catch (e: any) {
    const code = e?.response?.status === 409 ? "CONFLICT" : "CROSSMINT_ERROR";
    const message = e?.response?.data?.message || e.message || "Unknown error";
    logger.error({ route: "POST /api/wallets", correlationId, error: { code, message }, durationMs: Date.now() - started }, "wallet create failed");
    appendRecord({ ts: new Date().toISOString(), correlationId, operation: "createWallet", status: "error", requestSummary: req.body });
    res.setHeader("X-Correlation-Id", correlationId);
    return res.status(e?.response?.status || 500).json({ code, message, correlationId });
  }
});

export default router;

