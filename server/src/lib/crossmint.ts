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

