import pino from "pino";
import fs from "fs";
import path from "path";
import { env } from "./env";

// Ensure log directory exists
const logDir = path.dirname(env.LOG_FILE);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

export const logger = pino({ level: env.LOG_LEVEL, name: "wallets-backend" });

