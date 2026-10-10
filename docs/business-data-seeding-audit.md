# Business data and seeding audit

## Findings

The audit scanned 841 source files and inventoried 169 nonempty literal arrays or financial constants. This inventory includes legitimate static options and test fixtures; it is not a count of missing database tables. See hardcoded-data-inventory.json for initializer locations. Semantic checks also covered reimbursement handlers, yield handlers, card handlers, the workspace repository, seed script and transaction adapters. Arbitrary generated data and inline display literals require continued review; this report does not certify every workflow.

## Existing persistence

The local business.sqlite database contains three seeded workspaces. Across them it stores 11 invoices, 10 bills, 5 payrolls, 11 employees, 16 clients, 12 contacts, 5 payment links and 51 transaction rows, alongside team members, accounts, cards, card activity and financial history. These counts describe saved application records, not verified on-chain activity. Existing seeds do not rerun over an already imported workspace. Additional fields need an additive, repeatable seed operation that preserves user edits.

## Remaining data and behavior

| Area | Evidence | Required change |
| --- | --- | --- |
| Reimbursements | presentation/app/reimbursement/page.tsx: six literal rows and browser-local submissions; ReimbursementReviewContainer.tsx: four separately defined rows | One company-scoped reimbursement repository shared by list and review; stable IDs and idempotent historical seed; validated create, approve and reject operations |
| Receipt extraction | simulateExtract chooses amounts and descriptions from filenames; receipts use temporary object URLs | Remove invented extraction; support manual validated entry first, durable receipt upload and authorized retrieval; integrate an extraction provider separately |
| Reimbursement proposal | Review displays proposal success without a server mutation | Persist approval/payment requests; use the existing treasury policy and settlement state machine; mark paid only after confirmed settlement |
| Global accounts | global-account/page.tsx: four virtual accounts and six deposit rows | Seed only as clearly identified historical examples; real account details and deposit confirmation need a banking provider |
| Yield | earn/page.tsx: fixed APY, balance, earnings and TVL; random daily chart; eight activity rows; success-only deposit/withdraw handlers | Persist historical positions/activity; calculate charts and totals from records; obtain rates and actual execution from a configured provider |
| Payroll summary | Home/CardContainer.tsx: three fixed upcoming entries | Derive schedule and totals from saved payrolls rather than seed a second summary |
| Prices | Home/CardContainer.tsx: fixed non-USDC token prices | Use an actual pricing source if those assets are supported; USDC-only settlement should not manufacture unrelated market values |
| Deposit modal | DepositModal.tsx: fixed amount, available balance and displayed address | Read the selected account and actual Arc balance; calculate percentages from that balance |
| Cards | Saved card snapshots exist, but page handlers display issuance/top-up success without provider confirmation | Keep historical data distinct from executable operations; provider-backed issuance, funding and reconciliation remain deferred |
| Team and transaction adapters | team-member.ts and transaction.ts contain no-op/empty-return mutations | Implement server operations or fail explicitly; seeding cannot implement those actions |
| Tax reports | ReportsSection.tsx has literal jurisdiction rates and deadlines | Treat as versioned reference configuration requiring verification, not company transactions or current authoritative advice |

## Values that stay in code

Labels, status enums, date names, layout colors, icon paths, pagination sizes, validated network/token configuration, static selectable categories and intentionally illustrative login decorations do not require database seeding. Forecast scenarios are calculations rather than settled records.

## Implementation order

1. Add typed, company-scoped reimbursement records, validated APIs, durable receipts and read/modify permissions. Seed existing examples once, preserving their history and keeping examples separate from current spendable funds.
2. Point the preserved list and review UI at the same records; await saves and render server errors. Replace filename-based extraction with manual entry until an actual provider is configured.
3. Connect reimbursement approval and settlement to the existing Arc treasury workflow with idempotent request IDs and transaction reconciliation. Historical paid examples must not generate retroactive transfers.
4. Replace hardcoded financial summaries with queries over persistent records and actual wallet balances.
5. Add provider-dependent global-account, card and yield data only when configured; retain their history without pretending provider operations succeeded.
6. Verify persistence after refresh/restart, entity isolation, duplicate prevention, unauthorized access, policy rejection and one small Arc Testnet settlement. Do not count a saved demo balance as on-chain funds.

## Implementation status, October 10, 2026

Reimbursements now use company- and entity-scoped SQLite records, authenticated validated APIs, awaited saves, durable image receipts, approval notes and the existing Arc treasury approval and reconciliation flow. The six original examples were seeded once as historical records; they cannot submit payments. New expenses use idempotent identities and conditional updates. Receipt details require manual entry rather than filename-based extraction.

Dashboard balance observations come from the actual treasury wallet. Payroll schedules come from saved contracts. Historical global-account and yield examples are stored separately and clearly labeled. Card issuance, top-ups, bank-account operations and yield deposits or withdrawals report an unavailable provider rather than simulated success.

Verification confirmed one 0.001 USDC reimbursement on Arc Testnet, hash `0x9fccabe09c4bf8067ff29851fbbf396a092a8fc2c746f6c5dfb62fed0eaebffd`. Replaying the request did not create another payment. Checks covered unauthenticated access, cross-origin mutation rejection, entity isolation, receipt access, policy rejection, history protection and persistence after reopening the repository. Browser refresh displayed the same paid record and Explorer link in the preserved interface.

This completes the reimbursement and financial-history work described here, not certification of every application workflow. Fiat payouts, cards and yield operations still require their respective providers. Historical receipt filenames do not imply that original receipt files exist. Wallet history begins with actual recorded observations and does not invent prior balances.
