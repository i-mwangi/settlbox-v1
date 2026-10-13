import { openKoraSandbox } from "./kora-sandbox.ts";
import { openFiatPayouts, refreshFiatPayout, type FiatPayoutRepository } from "./fiat-payouts.ts";

export async function reconcilePayoutChecks(store: FiatPayoutRepository, company: string, keyEnv: string, now = Date.now(), refresh = refreshFiatPayout) {
  const claims = store.claimChecks(company, now);
  let checked = 0; let deferred = 0;
  for (const claim of claims) {
    try { await refresh(store, company, "payout-status-worker", keyEnv, claim.payoutId); store.finishCheck(company, claim, true, now); checked++; }
    catch { store.finishCheck(company, claim, false, now); deferred++; }
  }
  return { checked, deferred };
}
export async function runPayoutReconciliation() {
  const connections = openKoraSandbox(); const payouts = openFiatPayouts();
  try {
    // Imported here to keep the injectable reconciliation loop usable in isolated tests.
    const { readTreasuryConfiguration } = await import("./treasury-runtime");
    const company = readTreasuryConfiguration().wallet.companyId;
    if (!connections.get(company)) return { checked: 0, deferred: 0 };
    return await reconcilePayoutChecks(payouts, company, connections.verify(company));
  } finally { payouts.close(); connections.close(); }
}
