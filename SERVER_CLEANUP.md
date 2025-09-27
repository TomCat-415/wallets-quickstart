## Backend logs/records cleanup (optional)

This is an optional, safe cleanup to fix the accidental nested `server/server/...` path created when running the backend from inside the `server/` directory with relative file paths.

### When to run
- Only if you want log and record files to live under `server/logs` and `server/records` (recommended), instead of `server/server/...`.
- Logs/records are gitignored; leaving them as-is will not break anything.

### One-time safe cleanup
1) Stop the dev server (Ctrl+C in the terminal running `pnpm dev`).
2) From the repo root:
```bash
mv server/server/records/operations.jsonl server/records/operations.jsonl 2>/dev/null || true
rm -rf server/server
```
3) Update `server/.env` to use paths relative to the `server/` folder:
```bash
LOG_FILE=logs/app.log
RECORDS_FILE=records/operations.jsonl
```
4) Restart the server:
```bash
cd server && pnpm dev
```
5) Verify new output locations (from repo root):
```bash
tail -f server/logs/app.log
tail -n 20 server/records/operations.jsonl
```

### Why this happened
`LOG_FILE` and `RECORDS_FILE` were set to `server/...` while running `pnpm dev` inside `server/`. Those relative paths resolve to `server/server/...`. Using paths relative to `server/` avoids this.

### FAQ
- Is it mandatory? No. These files are gitignored and don’t affect app behavior.
- Will I lose data? The command moves your existing `operations.jsonl` to the canonical location. If the source file doesn’t exist, it silently continues.
- Can I revert? You can always point the paths back in `server/.env` and restart.


