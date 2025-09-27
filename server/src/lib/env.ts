import { z } from "zod";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// Load env from server/.env (already gitignored)
const envPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const EnvSchema = z.object({
  CROSSMINT_API_KEY: z.string().min(1, "CROSSMINT_API_KEY is required"),
  CROSSMINT_BASE_URL: z
    .string()
    .url("CROSSMINT_BASE_URL must be a valid URL")
    .transform((u) => u.replace(/\/$/, "")),
  CHAIN: z.literal("solana"),

  PORT: z
    .string()
    .default("4000")
    .transform((v) => Number(v))
    .pipe(z.number().int().positive()),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

  CORS_ORIGIN: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),

  LOG_FILE: z.string().default("server/logs/app.log"),
  RECORDS_FILE: z.string().default("server/records/operations.jsonl"),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const corsOrigins: string[] = (() => {
  const list: string[] = [];
  const { CORS_ORIGIN, CORS_ORIGINS } = process.env;
  if (CORS_ORIGIN) list.push(CORS_ORIGIN);
  if (CORS_ORIGINS) list.push(...CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean));
  // Always include localhost for dev convenience if not explicitly set
  if (!list.includes("http://localhost:3000")) list.push("http://localhost:3000");
  return Array.from(new Set(list));
})();

export const env = {
  ...parsed.data,
  CORS_ORIGINS_LIST: corsOrigins,
};


