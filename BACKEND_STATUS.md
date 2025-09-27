## Backend status (Solana REST demo)

What’s implemented
- Server in `server/` (TypeScript + Express) using Crossmint REST for wallets.
- Env + validation (`server/src/lib/env.ts`), CORS allowlist middleware, structured logging (stdout) and audit records (JSONL).
- Crossmint client (`server/src/lib/crossmint.ts`) using `type: solana-custodial-wallet` for create; helpers for get wallet, balances, activity, transfer.
- Solana devnet RPC fallback for native SOL balance.
- Routes per contract:
  - POST `/api/wallets` → create wallet for email/userId (works)
  - GET `/api/wallets/:walletId` → details (works)
  - GET `/api/wallets/:walletId/balance` → SOL via Crossmint or RPC fallback (works)
  - GET `/api/wallets/:walletId/activity` → requires `wallets:transactions.read` (works after enabling scope)
  - POST `/api/wallets/:walletId/transactions` → creates transfer (fails with clear error if insufficient funds)
  - GET `/health` → ok

Evidence gathered
- Curl runs for create/get/balance/activity/transfer with correlation IDs.
- Server logs printed to stdout (pnpm dev console) show route, correlationId, outcome, durationMs.
- Audit records appended under `server/server/records/operations.jsonl` (see SERVER_CLEANUP.md for canonicalizing paths).

Current env
- Frontend: `NEXT_PUBLIC_CHAIN=solana`, `NEXT_PUBLIC_BACKEND_URL=http://localhost:4000` (local dev).
- Backend: `CROSSMINT_API_KEY` (server key, staging), `CROSSMINT_BASE_URL=https://staging.crossmint.com/api/2022-06-09`, `CHAIN=solana`, `LOG_LEVEL=info`.
- CORS: localhost:3000 + Vercel prod/preview domains allowed.

Known notes
- Activity required adding `wallets:transactions.read` to server key.
- Balance uses RPC fallback on devnet (configurable later).
- Log file path and records path can be normalized to `server/logs` and `server/records` by following SERVER_CLEANUP.md and setting `LOG_FILE`/`RECORDS_FILE` in `server/.env`.

Next steps (backend)
1) Optional: Switch `LOG_FILE=logs/app.log`, `RECORDS_FILE=records/operations.jsonl`; restart; collect files for demo.
2) Optional: Add `SOLANA_RPC_URL` to use Helius.
3) Deploy backend (Render/Railway): root dir `server`, build `pnpm install && pnpm run build`, start `node dist/index.js`. Set envs and CORS origins.

Next steps (frontend)
1) In Vercel, set `NEXT_PUBLIC_BACKEND_URL=https://<your-render-service>` on the feature branch.
2) Add a small “Backend Demo” page that calls the backend endpoints and prints JSON results (create → balance → activity → transfer attempt), or keep using curl/Postman for validation and just wire one call for demo.
3) Verify end-to-end from the deployed frontend against the deployed backend.


