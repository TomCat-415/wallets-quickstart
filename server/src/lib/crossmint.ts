import axios from "axios";
import { env } from "./env";

export const crossmint = axios.create({
  baseURL: env.CROSSMINT_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "X-API-KEY": env.CROSSMINT_API_KEY,
  },
  timeout: 30_000,
});
// WHY: Centralized axios client enforces base URL, auth header, and timeouts.
// Callers pass Idempotency-Key when they need de-duplication on POST.

export interface CreateWalletRequest {
  identifierType: "email" | "userId";
  identifier: string;
  chain?: string;
  label?: string;
}

export async function createWallet(req: CreateWalletRequest, idempotencyKey?: string) {
  const headers = idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined;
  const response = await crossmint.post(
    "/wallets",
    {
      // For demo simplicity, use custodial Solana wallet. Alternatives include
      // "solana-mpc-wallet" or "solana-smart-wallet" which require extra config.
      type: "solana-custodial-wallet",
      linkedUser: `${req.identifierType}:${req.identifier}`,
      chain: req.chain ?? env.CHAIN,
      label: req.label,
    },
    { headers }
  );
  return response.data;
}

export async function getWallet(walletId: string) {
  const response = await crossmint.get(`/wallets/${encodeURIComponent(walletId)}`);
  return response.data;
}

export async function getWalletBalances(walletId: string, params?: { asset?: string }) {
  // WHY: Provider paths can differ; try /balance first, then /balances.
  try {
    const response = await crossmint.get(`/wallets/${encodeURIComponent(walletId)}/balance`, {
      params: { chain: env.CHAIN, ...params },
    });
    return response.data;
  } catch (e: any) {
    if (e?.response?.status !== 404) throw e;
    // Fallback to /balances if singular path is not found
    const response = await crossmint.get(`/wallets/${encodeURIComponent(walletId)}/balances`, {
      params: { chain: env.CHAIN, ...params },
    });
    return response.data;
  }
}

export async function getWalletActivity(walletId: string, params?: { limit?: number; cursor?: string }) {
  const response = await crossmint.get(`/wallets/${encodeURIComponent(walletId)}/transactions`, {
    params: { chain: env.CHAIN, ...params },
  });
  return response.data;
}

export async function createTransfer(
  walletId: string,
  body: { to: string; amount: string; asset: "native"; memo?: string },
  idempotencyKey?: string
) {
  const headers = idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined;
  // Map our contract to Crossmint expected body
  const response = await crossmint.post(
    `/wallets/${encodeURIComponent(walletId)}/transactions`,
    {
      chain: env.CHAIN,
      destinationAddress: body.to,
      amount: body.amount,
      token: body.asset === "native" ? "native" : body.asset,
      memo: body.memo,
    },
    { headers }
  );
  return response.data;
}

