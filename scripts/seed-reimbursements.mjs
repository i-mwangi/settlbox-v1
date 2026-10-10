import { readFileSync } from "node:fs";
import { openReimbursements } from "../services/server/reimbursements.ts";
import { readTreasuryConfiguration } from "../services/server/treasury-runtime.ts";

const repository = openReimbursements();
try {
  const rows = JSON.parse(readFileSync("public/reimbursement-history.json", "utf8"));
  repository.seed(readTreasuryConfiguration().wallet.companyId, "entity-3", rows);
  console.log(`Saved ${rows.length} historical reimbursement examples without creating payments`);
} finally { repository.close(); }
