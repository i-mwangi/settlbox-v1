import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { openBusinessRecords } from "../services/server/business-records.ts";
import { openPayrollContracts } from "../services/server/payroll-contracts.ts";

export function prepareScheduledPayments() {
  const config = JSON.parse(readFileSync(resolve(process.env.SETTLBOX_TREASURY_CONFIG || ".data/treasury-config.json"), "utf8"));
  if (config.wallet?.chainId !== 5042002 || typeof config.wallet.companyId !== "string" || !config.wallet.companyId || (process.env.NEXT_PUBLIC_ARC_ENVIRONMENT && process.env.NEXT_PUBLIC_ARC_ENVIRONMENT !== "testnet")) throw new Error("An Arc Testnet company wallet is required");
  const repository = openBusinessRecords();
  try {
    const payments = repository.prepareDuePayments(config.wallet.companyId).length;
    const payrolls = openPayrollContracts();
    try { return payments + payrolls.prepareDue(config.wallet.companyId, "entity-3").length; }
    finally { payrolls.close(); }
  }
  finally { repository.close(); }
}

export function startPaymentScheduleWorker() {
  const prepare = () => {
    try { const count = prepareScheduledPayments(); if (count) console.log(`${count} scheduled payment drafts prepared for review`); }
    catch { console.error("Scheduled payment drafts could not be prepared; retry from Scheduled payments"); }
  };
  prepare();
  const timer = setInterval(prepare, 60000);
  timer.unref();
  return () => clearInterval(timer);
}
