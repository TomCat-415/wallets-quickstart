import { Router } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";
import { appendRecord } from "../lib/records";
import { createWallet, getWallet, getWalletBalances, getWalletActivity, createTransfer } from "../lib/crossmint";
import { getNativeSolBalance } from "../lib/solana";
import { env } from "../lib/env";

const router = Router();

function getCorrelationId(req: any): string {
  return (req.headers["x-correlation-id"] as string) || cryptoRandom();
}

function cryptoRandom(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// POST /api/wallets
// WHY: Provision a new wallet for a user identifier. Returns 201 with resource info.
// Uses Idempotency-Key to avoid duplicate creations and echoes X-Correlation-Id for tracing.
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

// GET /api/wallets/:walletId
// WHY: Fetch canonical wallet details. 200 on success, 404->NOT_FOUND.
router.get("/wallets/:walletId", async (req, res) => {
  const started = Date.now();
  const correlationId = getCorrelationId(req);
  const { walletId } = req.params as { walletId: string };
  try {
    const data = await getWallet(walletId);
    const response = {
      walletId: data.id || walletId,
      address: data.address || data.wallet?.address,
      chain: data.chain || env.CHAIN,
      status: data.status || "ready",
      createdAt: data.createdAt || undefined,
    };
    res.setHeader("X-Correlation-Id", correlationId);
    logger.info({ route: "GET /api/wallets/:walletId", correlationId, operation: "getWallet", outcome: "success", durationMs: Date.now() - started });
    return res.json(response);
  } catch (e: any) {
    const code = e?.response?.status === 404 ? "NOT_FOUND" : "CROSSMINT_ERROR";
    const message = e?.response?.data?.message || e.message || "Unknown error";
    res.setHeader("X-Correlation-Id", correlationId);
    logger.error({ route: "GET /api/wallets/:walletId", correlationId, error: { code, message }, durationMs: Date.now() - started });
    return res.status(e?.response?.status || 500).json({ code, message, correlationId });
  }
});

// GET /api/wallets/:walletId/balance
// WHY: Return balances. If provider path is missing, fall back to devnet RPC for SOL.
router.get("/wallets/:walletId/balance", async (req, res) => {
  const started = Date.now();
  const correlationId = getCorrelationId(req);
  const { walletId } = req.params as { walletId: string };
  try {
    const data = await getWalletBalances(walletId, { asset: (req.query.asset as string) || undefined });
    const balances = data?.balances || data || [];
    res.setHeader("X-Correlation-Id", correlationId);
    logger.info({ route: "GET /api/wallets/:walletId/balance", correlationId, operation: "getBalance", outcome: "success", durationMs: Date.now() - started });
    return res.json({ balances });
  } catch (e: any) {
    // Fallback to Solana RPC native balance on devnet
    try {
      const bal = await getNativeSolBalance(walletId);
      res.setHeader("X-Correlation-Id", correlationId);
      logger.info({ route: "GET /api/wallets/:walletId/balance", correlationId, operation: "getBalance", outcome: "success", note: "solana rpc fallback", durationMs: Date.now() - started });
      return res.json({ balances: [bal] });
    } catch (inner: any) {
      const code = e?.response?.status === 404 ? "NOT_FOUND" : "CROSSMINT_ERROR";
      const message = e?.response?.data?.message || e.message || "Unknown error";
      res.setHeader("X-Correlation-Id", correlationId);
      logger.error({ route: "GET /api/wallets/:walletId/balance", correlationId, error: { code, message }, durationMs: Date.now() - started });
      return res.status(e?.response?.status || 500).json({ code, message, correlationId });
    }
  }
});

// GET /api/wallets/:walletId/activity
// WHY: List recent transactions (paginated with cursor).
router.get("/wallets/:walletId/activity", async (req, res) => {
  const started = Date.now();
  const correlationId = getCorrelationId(req);
  const { walletId } = req.params as { walletId: string };
  const params = {
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    cursor: (req.query.cursor as string) || undefined,
  };
  try {
    const data = await getWalletActivity(walletId, params);
    const response = {
      items: Array.isArray(data?.items) ? data.items : data || [],
      nextCursor: data?.nextCursor ?? null,
    };
    res.setHeader("X-Correlation-Id", correlationId);
    logger.info({ route: "GET /api/wallets/:walletId/activity", correlationId, operation: "getActivity", outcome: "success", durationMs: Date.now() - started });
    return res.json(response);
  } catch (e: any) {
    const code = e?.response?.status === 404 ? "NOT_FOUND" : "CROSSMINT_ERROR";
    const message = e?.response?.data?.message || e.message || "Unknown error";
    res.setHeader("X-Correlation-Id", correlationId);
    logger.error({ route: "GET /api/wallets/:walletId/activity", correlationId, error: { code, message }, durationMs: Date.now() - started });
    return res.status(e?.response?.status || 500).json({ code, message, correlationId });
  }
});

// POST /api/wallets/:walletId/transactions
// WHY: Submit a transfer; returns 202 Accepted for async processing.
// Validates body, supports idempotency, and writes an audit record.
router.post("/wallets/:walletId/transactions", async (req, res) => {
  const started = Date.now();
  const correlationId = getCorrelationId(req);
  const { walletId } = req.params as { walletId: string };
  const schema = z.object({
    to: z.string().min(1),
    amount: z.string().min(1),
    asset: z.literal("native"),
    memo: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    const error = { code: "VALIDATION_ERROR", message: "Invalid body", details: parsed.error.flatten(), correlationId };
    logger.warn({ route: "POST /api/wallets/:walletId/transactions", correlationId, error, durationMs: Date.now() - started }, "validation error");
    return res.status(422).json(error);
  }
  try {
    const idempotencyKey = (req.headers["idempotency-key"] as string) || undefined;
    const data = await createTransfer(walletId, parsed.data, idempotencyKey);
    const response = {
      transactionId: data.id || data.transactionId,
      status: data.status || "pending",
      txHash: data.txHash || null,
    };
    appendRecord({
      ts: new Date().toISOString(),
      correlationId,
      operation: "createTransaction",
      walletId,
      requestSummary: parsed.data,
      responseSummary: response,
      status: "success",
    });
    res.setHeader("X-Correlation-Id", correlationId);
    logger.info({ route: "POST /api/wallets/:walletId/transactions", correlationId, operation: "createTransaction", outcome: "success", durationMs: Date.now() - started });
    return res.status(202).json(response);
  } catch (e: any) {
    const code = e?.response?.status === 409 ? "CONFLICT" : e?.response?.status === 402 ? "INSUFFICIENT_FUNDS" : "CROSSMINT_ERROR";
    const message = e?.response?.data?.message || e.message || "Unknown error";
    appendRecord({ ts: new Date().toISOString(), correlationId, operation: "createTransaction", walletId, status: "error", requestSummary: req.body });
    res.setHeader("X-Correlation-Id", correlationId);
    logger.error({ route: "POST /api/wallets/:walletId/transactions", correlationId, error: { code, message }, durationMs: Date.now() - started });
    return res.status(e?.response?.status || 500).json({ code, message, correlationId });
  }
});

