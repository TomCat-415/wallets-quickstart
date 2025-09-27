import fs from "fs";
import path from "path";
import { env } from "./env";

type OperationName =
  | "createWallet"
  | "getWallet"
  | "getBalance"
  | "getActivity"
  | "createTransaction"
  | "fund";

export interface AuditRecord {
  ts: string;
  correlationId: string;
  operation: OperationName;
  identifier?: string;
  walletId?: string;
  address?: string;
  requestSummary?: Record<string, unknown>;
  responseSummary?: Record<string, unknown>;
  status: "success" | "error";
}

const recordsDir = path.dirname(env.RECORDS_FILE);
if (!fs.existsSync(recordsDir)) {
  fs.mkdirSync(recordsDir, { recursive: true });
}

export function appendRecord(record: AuditRecord) {
  const line = JSON.stringify(record) + "\n";
  fs.appendFileSync(env.RECORDS_FILE, line, { encoding: "utf8" });
}

