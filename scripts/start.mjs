import { resolve } from "node:path";
import { startPaymentScheduleWorker } from "./payment-schedule-worker.mjs";
import { startFinanceAgentWorker } from "./finance-agent-worker.mjs";
import { startPayoutStatusWorker } from "./payout-status-worker.mjs";

process.env.HOSTNAME ||= "127.0.0.1";
for (const [name, fallback] of Object.entries({
  SETTLBOX_TREASURY_CONFIG: ".data/treasury-config.json",
  SETTLBOX_TREASURY_DATABASE: ".data/treasury.sqlite",
  SETTLBOX_SESSION_DATABASE: ".data/sessions.sqlite",
  SETTLBOX_BUSINESS_DATABASE: ".data/business.sqlite",
  SETTLBOX_GIFT_ESCROW_CONFIG: ".data/gift-escrow.json",
  SETTLBOX_UPLOAD_DIRECTORY: ".data/uploads",
})) {
  process.env[name] = resolve(process.env[name] || fallback);
}
const stopScheduleWorker = startPaymentScheduleWorker();
process.once("exit", stopScheduleWorker);
const stopFinanceWorker = startFinanceAgentWorker();
process.once("exit", stopFinanceWorker);
const stopPayoutWorker = startPayoutStatusWorker();
process.once("exit", stopPayoutWorker);
await import("../.next/standalone/server.js");
