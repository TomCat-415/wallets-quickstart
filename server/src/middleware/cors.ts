import cors from "cors";
import type { CorsOptions } from "cors";
import { env } from "../lib/env";

export function createCorsMiddleware() {
  const options: CorsOptions = {
    origin: (requestOrigin, callback) => {
      if (!requestOrigin) return callback(null, true); // non-browser clients
      const allowed = env.CORS_ORIGINS_LIST.some((o) => requestOrigin === o || matchesPreview(requestOrigin));
      callback(allowed ? null : new Error("Not allowed by CORS"), allowed);
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-Correlation-Id", "Idempotency-Key"],
    credentials: false,
  };
  return cors(options);
}

function matchesPreview(origin: string): boolean {
  // Allow Vercel preview URLs for this project safely
  // Example: https://wallets-quickstart-<branch>-<hash>-thc.vercel.app
  try {
    const url = new URL(origin);
    return /\.vercel\.app$/.test(url.hostname) && url.hostname.startsWith("wallets-quickstart-");
  } catch {
    return false;
  }
}

