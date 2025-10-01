import pino from "pino";
import fs from "fs";
import path from "path";
import { env } from "./env";

// WHY: Structured logs are the backbone of ops and debugging.
// We write JSON to stdout (platform logs) and can tee to a file if needed.
// Ensure log directory exists
const logDir = path.dirname(env.LOG_FILE);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

export const logger = pino({ level: env.LOG_LEVEL, name: "wallets-backend" });

