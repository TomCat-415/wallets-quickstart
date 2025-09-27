## Backend wallets reference (Solana + Crossmint)

Purpose: reusable checklist to stand up a Node REST backend for wallets, Solana-first.

### 1) Prereqs
- Server key (staging) with scopes: `wallets.create`, `wallets.read`, `wallets:transactions.create`, `wallets:transactions.sign`, `wallets:balance.read`, `wallets.fund`, `wallets:transactions.read` (for activity).
- Supported chain id: `solana`.
- Staging base URL: `https://staging.crossmint.com/api/2022-06-09`.

### 2) Env
- `CROSSMINT_API_KEY` – server key
- `CROSSMINT_BASE_URL` – Crossmint staging base URL (no trailing slash)
- `CHAIN=solana`
- `PORT=4000`
- `LOG_LEVEL=info`
- `CORS_ORIGIN` or `CORS_ORIGINS` – comma-separated origins (localhost:3000, Vercel prod/preview)
- Optional: `LOG_FILE=logs/app.log`, `RECORDS_FILE=records/operations.jsonl`
- Optional later: `SOLANA_RPC_URL` (Helius) for balance fallback

### 3) CORS
- Allow: http://localhost:3000, https://<your-prod>.vercel.app, preview *.vercel.app (project slug).
- Methods: GET, POST, OPTIONS. Headers: Content-Type, X-Correlation-Id, Idempotency-Key. Credentials: false.

### 4) Logging + records
- Logger fields: level, time, msg, route, correlationId, request { ip, method, path }, actor, wallet, operation, outcome, error { code, message }, durationMs.
- Records (JSONL): ts, correlationId, operation, identifier, walletId/address, requestSummary, responseSummary, status.
- Paths: `logs/app.log`, `records/operations.jsonl` (see SERVER_CLEANUP.md for path gotchas).

### 5) REST routes (contract)
- POST `/api/wallets`
  - Body: { identifierType: "email"|"userId", identifier: string, chain?: string, label?: string }
  - Response: { walletId, address, chain, linkedUser, createdAt }
- GET `/api/wallets/:walletId`
  - Response: { walletId, address, chain, status, createdAt? }
- GET `/api/wallets/:walletId/balance`
  - Response: { balances: [ { asset: "SOL", amount: string, decimals: 9 } ] }
- GET `/api/wallets/:walletId/activity`
  - Response: { items: [...], nextCursor: string|null }
- POST `/api/wallets/:walletId/transactions`
  - Body: { to: string, amount: string, asset: "native", memo?: string }
  - Response: { transactionId, status, txHash|null }
- Errors: { code, message, details?, correlationId }
- Headers: optional `X-Correlation-Id`; POSTs accept `Idempotency-Key`.

### 6) Crossmint client usage
- Create wallet (Solana): `type: "solana-custodial-wallet"`, `linkedUser: "email:<addr>"` (auto-provisions user if needed).
- Get wallet: `GET /wallets/{walletId}`.
- Balance: try `/wallets/{id}/balance` then `/wallets/{id}/balances`.
- Activity: `GET /wallets/{id}/transactions` (needs `wallets:transactions.read`).
- Transfer: `POST /wallets/{id}/transactions` with `destinationAddress`, `amount`, `token: "native"`, `memo?`.

### 7) Solana notes
- For demos, use devnet and native SOL. Later add SPL tokens (e.g., devnet USDC) by supporting an `asset` param like `mint:<address>`.
- RPC fallback: `getBalance` on devnet; replace with Helius via `SOLANA_RPC_URL` when available.

### 8) Testing (curl)
- Health: `curl http://localhost:4000/health`
- Create: `POST /api/wallets` with email; capture address.
- Get: `GET /api/wallets/{address}`
- Balance: `GET /api/wallets/{address}/balance`
- Activity: `GET /api/wallets/{address}/activity`
- Transfer: `POST /api/wallets/{address}/transactions` (small amount; expect success if funded or clear error if not)

### 9) Deployment
- Render (monorepo): root `server`, build `pnpm install && pnpm run build`, start `node dist/index.js`.
- Env vars on host: same as local; set CORS origins to your Vercel domains.
- Frontend: set `NEXT_PUBLIC_BACKEND_URL=https://<your-render-service>` in Vercel.

### 10) Vendor independence (future)
- Keep frontend → your backend → Crossmint adapter. To migrate later, swap the adapter; preserve your public API.


