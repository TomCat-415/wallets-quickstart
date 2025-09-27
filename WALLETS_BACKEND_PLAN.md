## Crossmint Wallets Backend + Frontend Demo Plan

Goal: Create a working backend example for Crossmint Wallets using Node.js and REST API, wire it to this frontend (wallets-quickstart), and demonstrate end-to-end behavior with logging and simple records.

### What you will build
- A small Node.js backend that calls Crossmint Wallets REST APIs.
- A minimal connection from the existing Next.js frontend to that backend.
- Structured logs and simple records that show each action (create wallet, read balance, transfer, etc.).

### Docs and references
- Wallets overview: `https://docs.crossmint.com/introduction/platform/wallets`
- API keys: `https://docs.crossmint.com/introduction/platform/api-keys`
- Supported chains: `https://docs.crossmint.com/introduction/supported-chains`
- Quickstarts: `https://www.crossmint.com/quickstarts`

Note: The exact REST API reference paths can move over time. Use the Wallets section in the docs sidebar for the latest endpoints and request/response schemas.

---

## 1) Architecture choice

- Primary path: REST API from a Node.js backend (server-centric). This directly satisfies “Node.js / REST API” and is closest to a production integration where secrets remain server-side.
- Alternative: Node server SDK. If desired, you can swap REST calls for the official server SDK later; the endpoint design below still applies one-to-one.

---

## 2) Environments and credentials

- Use Crossmint Staging for development/testing.
- Create a server-side API key in the Crossmint Console with at least these scopes (README already lists them for wallets):
  - `users.create`, `users.read`
  - `wallets.read`, `wallets.create`
  - `wallets:transactions.create`, `wallets:transactions.sign`
  - `wallets:balance.read`, `wallets.fund`

Backend env vars (examples):
- `CROSSMINT_API_KEY` – your server API key (keep secret)
- `CROSSMINT_BASE_URL` – staging base URL (from docs)
- `CHAIN` – one of the supported chains (see docs). For demo, you can use a test chain and USDXM.
- `PORT` – backend port (e.g., 4000)
- `LOG_LEVEL` – info | debug

Frontend env vars:
- `NEXT_PUBLIC_BACKEND_URL` – http://localhost:4000 (or your deployed backend URL)
- Keep using your existing `NEXT_PUBLIC_CROSSMINT_API_KEY` for the frontend quickstart (client scopes already in README).

---

## 3) Repo and folder structure

Option A (recommended for speed): add a backend folder to this repo
- `server/` – Node.js Express app that calls Crossmint REST.
  - `src/` (routes, services)
  - `logs/` (JSON logs)
  - `records/` (JSONL records of business actions)

Option B: separate backend repo
- New repo, e.g., `wzrd-wallets-backend-demo`, and run both repos side by side locally.

Git commands (if separate repo):
```bash
mkdir ~/development/wzrd-wallets-backend-demo && cd ~/development/wzrd-wallets-backend-demo
git init
git remote add origin <your-empty-github-repo-url>
git branch -M main
git push -u origin main
```

Git commands (if adding into this repo under `server/`):
```bash
cd /Users/thc/development/wallets-quickstart
git checkout -b feat/backend-demo
# (later) git add . && git commit -m "feat(server): add REST backend demo for wallets" && git push -u origin feat/backend-demo
```

---

## 4) Backend implementation plan (REST)

Initialize and dependencies
- Initialize Node.js app (npm, pnpm, or yarn)
- Install: `express`, `axios`, `cors`, `dotenv`, `pino` (logging), optionally `pino-pretty` for local, and a lightweight validator like `zod` for request validation.

Service config
- Read `CROSSMINT_API_KEY`, `CROSSMINT_BASE_URL`, and `CHAIN` from env.
- Create an Axios instance with base URL and `X-API-KEY` header.

REST endpoints to implement
- POST `/api/users` (optional): create a Crossmint user if your flow needs an internal user ID. Alternatively, you can link wallets to e.g., `email:john@doe.com` via `linkedUser` when creating a wallet.
- POST `/api/wallets`
  - Input: `{ identifierType: 'email' | 'userId', identifier: string, chain?: string }`
  - Behavior: create a wallet for the user on the chosen chain (default to `CHAIN`).
  - Output: `{ walletId, address, chain }`
- GET `/api/wallets/:walletId`
  - Fetch wallet details and return address/metadata.
- GET `/api/wallets/:walletId/balance`
  - Optional query: `?token=USDXM` vs native; return balances per token.
- GET `/api/wallets/:walletId/activity`
  - List recent transactions/activity for the wallet.
- POST `/api/wallets/:walletId/transactions`
  - Input: `{ to, amount, token }` (token can be native or USDXM on test chain)
  - Behavior: create transaction via Crossmint, sign if required (per docs), return tx id / status.
- POST `/api/wallets/:walletId/fund`
  - If supported on chosen chain, fund with test assets (docs mention `wallets.fund`).

Error handling
- Validate inputs (zod), map Crossmint errors to clear 4xx/5xx responses, include a `correlationId` header in responses and logs.

Security
- Do not expose `CROSSMINT_API_KEY` to the client.
- Limit CORS to your localhost dev origin during development.

### API contract (Solana-focused, no code)

Conventions
- Content-Type: `application/json`
- Headers: accept optional `X-Correlation-Id` on every request; echo it back in responses
- Chain: default to `solana` from server env; allow override per request where noted
- All amounts are strings to preserve precision; SOL uses 9 decimals

1) POST `/api/wallets`
- Purpose: Create a wallet for a user identifier
- Request body (at least one identifier type required):
```json
{
  "identifierType": "email" | "userId",
  "identifier": "user@example.com",
  "chain": "solana",
  "label": "optional-human-label"
}
```
- Responses
  - 201 Created
```json
{
  "walletId": "wlt_123",
  "address": "SoLanaAddr...",
  "chain": "solana",
  "linkedUser": { "type": "email", "value": "user@example.com" },
  "createdAt": "2025-09-27T10:15:00Z"
}
```
  - 409 Conflict (already exists) → include existing `walletId` and `address`
  - 400/422 for validation errors

2) GET `/api/wallets/:walletId`
- Purpose: Fetch basic wallet details
- Response 200
```json
{
  "walletId": "wlt_123",
  "address": "SoLanaAddr...",
  "chain": "solana",
  "status": "ready",
  "createdAt": "2025-09-27T10:15:00Z"
}
```

3) GET `/api/wallets/:walletId/balance`
- Query params: `asset` optional
  - For Solana demo, default `asset=native` (SOL)
- Response 200 (example returning a list for future SPL tokens compatibility)
```json
{
  "balances": [
    { "asset": "SOL", "amount": "0.123456789", "decimals": 9 }
  ]
}
```

4) GET `/api/wallets/:walletId/activity`
- Query params: `limit` (default 20), `cursor` for pagination
- Response 200
```json
{
  "items": [
    {
      "id": "tx_abc",
      "type": "transfer",
      "status": "confirmed",
      "txHash": "5u...abc",
      "direction": "outbound",
      "asset": "SOL",
      "amount": "0.001",
      "timestamp": "2025-09-27T10:20:00Z"
    }
  ],
  "nextCursor": null
}
```

5) POST `/api/wallets/:walletId/transactions`
- Purpose: Send a small transfer
- Request body
```json
{
  "to": "RecipientSolAddr...",
  "amount": "0.001",
  "asset": "native",
  "memo": "optional"
}
```
- Responses
  - 202 Accepted (async processing) or 201 Created (sync)
```json
{
  "transactionId": "tx_abc",
  "status": "pending",
  "txHash": null
}
```
  - 400/422 for validation errors; 402 or 409 for insufficient balance/nonce conflicts

6) POST `/api/wallets/:walletId/fund`
- Purpose: Request devnet funds where supported
- Request body (keep minimal; provider may ignore `amount`):
```json
{
  "asset": "native",
  "amount": "1"
}
```
- Response 202
```json
{
  "status": "requested",
  "txHash": null
}
```

7) POST `/api/users` (optional; usually not needed server-side)
- If implemented, accepts `{ "identifierType": "email"|"userId", "identifier": "..." }`
- Note: server keys may not include `users.create`; wallet creation with `linkedUser` usually provisions implicitly

Errors (all endpoints)
- Response shape
```json
{
  "code": "VALIDATION_ERROR" | "CROSSMINT_ERROR" | "NOT_FOUND" | "CONFLICT" | "INSUFFICIENT_FUNDS",
  "message": "Human-readable message",
  "details": { "field": "identifier", "reason": "must be a valid email" },
  "correlationId": "..."
}
```

Headers and idempotency
- Accept `Idempotency-Key` on POST endpoints; forward to Crossmint if applicable and echo back
- Always echo `X-Correlation-Id` in responses (generate if not provided by client)

Solana specifics
- For this demo, use native SOL only (`asset=\"native\"` → `SOL`). No USDXM on Solana
- Amount precision: 9 decimals; validate string format

---

## 5) Logging and records

Logging (structured)
- Use `pino` JSON logs. Include: timestamp, level, route, correlationId, user identifier, walletId (if any), and result (success/failure + error code).
- Write logs to stdout and to a rotating file in `server/logs/app.log` (local dev).

Records (simple audit trail)
- Append business-level records to `server/records/operations.jsonl` with a compact schema, e.g.:
  - `type`: createWallet | getBalance | transfer | fund | getActivity
  - `correlationId`: string
  - `userIdentifier`: email or userId
  - `walletId`: string
  - `request`: minimal sanitized payload
  - `response`: minimal sanitized response summary (no secrets)
  - `status`: success | error
  - `ts`: ISO datetime

Optional dev-only endpoint
- GET `/admin/records` – returns the last N records (behind a simple dev guard) to visually demonstrate actions without digging into files.

---

## 6) Frontend integration plan (this repo)

Minimal wiring for demonstration
- Add `NEXT_PUBLIC_BACKEND_URL` in `.env.local` (e.g., `http://localhost:4000`).
- Create a lightweight page or component (e.g., Backend Demo) that:
  1) Calls POST `/api/wallets` for a test email to provision a wallet
  2) Calls GET `/api/wallets/:walletId/balance` to show native + USDXM
  3) Calls POST `/api/wallets/:walletId/transactions` to send a tiny amount to another wallet
  4) Calls GET `/api/wallets/:walletId/activity` to show the transfer
- Keep all sensitive work server-side; the frontend only calls your backend.

Note: This repo already includes UI components for wallet actions using the client SDK. For this task, we’re demonstrating a server-centric flow; add a small, separate UI surface so as not to disturb the existing quickstart pages.

---

## 7) End-to-end test plan (local)

Prep
- Ensure you have a valid server API key with the scopes listed above.
- Choose a supported test chain (see docs), and use USDXM where helpful.

Run
1) Start backend: `PORT=4000 CROSSMINT_API_KEY=... CHAIN=... npm run start`
2) Start frontend (this repo): `pnpm dev` (or your package manager)
3) Navigate to the new Backend Demo page
4) Perform: create wallet → view balance → transfer small amount → view activity

Verify via logs/records
- Tail `server/logs/app.log` and open `server/records/operations.jsonl`
- Confirm each step appended a record with `status=success` and a consistent `correlationId`

---

## 8) Git workflow and commands

Branching
- Create a feature branch (e.g., `feat/backend-demo`)
- Commit early and often; include scope in commit messages (server, docs, app)

Suggested commands
```bash
# From this repo root
git checkout -b feat/backend-demo

# After adding the server folder and docs
git add .
git commit -m "feat(server): add Node REST backend plan and scaffold"
git push -u origin feat/backend-demo
```

If you decide on a separate backend repo, initialize and push as shown in section 3.

---

## 9) Deployment notes (optional for demo)

- Backend: Render/Railway/Fly.io or your preferred host. Set env vars in provider settings. Restrict CORS to your frontend domain.
- Frontend: Vercel deployment of this repo already works. Add `NEXT_PUBLIC_BACKEND_URL` to Vercel project env.

---

## 10) Alternative: Node server SDK

If you prefer SDK over raw REST:
- Replace Axios calls with the official server SDK methods.
- Keep the same REST endpoint surface so the frontend remains unchanged.
- Confirm scopes and behavior are identical (wallet creation, balance, transfer, activity, fund).

---

## 11) Demo acceptance checklist

- Backend can:
  - Create wallet for a given identifier (email or userId)
  - Return wallet details and balances
  - Submit a small transfer and return transaction info
  - List wallet activity including the transfer
- Frontend can call backend endpoints and show results
- Logs and records clearly capture each action with correlationId
- No secrets in the frontend or logs/records

---

## 12) Notes specific to WZRD

- The server-centric approach is closer to how a marketplace/launcher would manage wallets and flows.
- Starting with 0% platform fee aligns with keeping on-chain actions cheap; later you can add fee logic in backend routes (e.g., platform fee on transfers or purchases) without exposing logic client-side.


