# Finance automation

The worker manages eligible vault payments and reconciles their settlement. See [workflow verification history](workflow-readiness-audit.md) for dated live results.

Automation starts stopped. Company owners can enable or stop it in Settings → Finance controls. Each cycle reconciles existing requests and attempts execution only for payments ready on-chain. Optional automatic queueing creates a fresh plan for obligations due by the current date in Africa/Nairobi. Azure provides advisory review; deterministic policy and the contract determine eligibility. The worker cannot sign human approvals or administer the vault.

The persisted settings include an additional liquidity reserve and a cap of one to five submission attempts per cycle. The UI uses three. Failed attempts count toward the cap. Company leases prevent overlapping cycles; stopped or revised settings invalidate a running cycle before its next submission. Transactions already submitted can still confirm. Existing provider idempotency keys and the contract's payment identifiers prevent duplicate settlement on retries.

Set the server-only `SETTLBOX_FINANCE_WORKER_TOKEN` to at least 32 random characters. Production `npm start` starts the minute-based runner. During development, run `npm run agent:worker` with `PORT` matching the development server. The token authorizes cycles only; settings changes require an authenticated company owner. Configuration does not prove that a runner process is running. The owner can also use Run one cycle.

With the current vault policy, every positive payment needs human approval. USYC subscription and redemption are separate unfinished work and are not performed by this worker.
