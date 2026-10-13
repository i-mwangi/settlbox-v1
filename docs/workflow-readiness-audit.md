# Workflow readiness audit — updated October 12, 2026

This audit records verified behavior and remaining acceptance work. Four small Arc Testnet settlements have been verified: the agent vault bill, direct company-wallet reimbursement, incoming invoice collection and contractor payment. Automated failure checks complement these live journeys; they do not establish mainnet readiness or external provider availability.

## Latest verification — October 12

- Contractor `PAY-3-1`, canonical record `10c2e84a-672a-40db-a920-3ef409c17263`, is paid in durable storage. Successful Arc transaction `0x24a733d5b2c1978fc404e930e34f5c6018aee19d3ac4fea03a7d09a4372c8876` at block 66720854 transferred 0.001 USDC from the company wallet to `0xa2F8a545bD0FC4C2dCf2D7A71631803Cfb52FB01`. The user explicitly authorized this recipient and completed approval. Vault permissions were not changed by that direct-payment authorization.
- Production restart and full browser reload preserved contractor bill `BILL-1791739795861` as Paid with its exact 0.001 USDC amount. The pending Transactions list was empty. Final production build and the isolated HTTP harness passed after dependency updates.
- All 115 automated tests pass, including separate-process journal reopening, stale provider response rejection, immutable payment instructions/provider identity, bounded retries, stop during planning, company isolation and current-role permissions.
- An isolated production HTTP harness verified owner-only automation controls, unauthorized and cross-origin upload rejection, corrupt and oversized image rejection, valid receipt persistence across a real server restart and company-scoped receipt reads. It submitted no financial transaction. Run with `node --experimental-strip-types scripts/verify-workflow-boundaries.mjs` after a production build.
- Receipt uploads now fully decode PNG/JPEG content with bounded pixel and byte limits; storage is company-scoped. Existing single-company receipts retain a fixed legacy owner marker.
- Worker stop and additional reserve checks are repeated immediately before provider submission. A successful stop cannot retract an already submitted transaction; reconciliation continues to determine its actual outcome.
- Production dependency audit after compatible updates reports zero known advisories. Sharp is a direct patched dependency for receipt decoding; targeted PostCSS, gRPC, Undici and UUID overrides avoid a framework major upgrade or Circle SDK downgrade. The SDK uses UUID v4, whose public API is preserved. Development lint dependency advisories remain; this is not a claim that every development dependency has a clean audit.

The table and dated notes below retain the earlier audit history. Their pending invoice collection, contractor settlement and receipt boundary checks are superseded by the evidence above. USYC execution remains an implementation gap as well as an external entitlement dependency; it must not be described as completed merely because its read adapter exists.

| Workflow | Evidence and current state | Required acceptance checks |
|---|---|---|
| Vault treasury | Live Circle human approval, developer executor and exact receipt/event reconciliation succeeded; saved bill paid, fresh balance 19.999 USDC. Vault journal prevents direct-route duplication. | Fresh contractor obligation through the UI; rejected recipient, expired request, changed policy, insufficient liquidity and restart recovery. |
| Finance automation | Persisted owner controls, company leases, action caps, stop checks, reserve checks; real minute-based runner observed zero-attempt cycles. Pure worker and SQLite tests pass. | Restart with a pending queue/execution; uncertain Circle response; multiple runners; disable during RPC/AI wait; verify exactly one final transfer and business transition. Current policy requires human approval for positive amounts. |
| Invoices | Business issue action creates a durable payment link; refresh uses verified payment-link records. Presentation and PDF persistence have tests. Incoming invoices are receivables, not spendable funds. | Create/edit/issue/download, pay from external test wallet, reconcile after refresh/restart, reject duplicate settlement and wrong recipient/amount. Verify filter and client/group mapping in browser. |
| Bills | Canonical records, draft edits, direct treasury route and vault route implemented. Live test bill paid via vault. | New bill create/edit/cancel; direct and vault route exclusion; failure/retry behavior; paid record cannot be edited or paid again. Investigate route claiming on refresh of an unsubmitted draft. |
| Contractors/payroll | Company-scoped employee/contractor records and payroll terms; payroll contracts persist period preparation, confirmation and status. Repository tests exist. | Create contractor and group; edit wallet/terms; prepare one period twice; verify one payable obligation; confirm, approve, settle and reload; pause/resume/cancel. |
| Reimbursements | Durable receipts and review records; approved expenses create canonical business obligations; historical examples cannot pay. Reads map canonical settlement back into expense status. | Upload actual image; create/reject/approve; reload; submit/authorize/reconcile; duplicate clicks; invalid image and unauthorized role checks. The existing 0.002 expense remains blocked by policy. |
| Uploads | Authenticated same-origin endpoint enforces image input and 2 MB limit. | Browser persistence, corrupt content, oversize body, foreign company URL access and missing-file handling. |
| Team | Owner-controlled mutations and persistent invitation/member registry; current role rechecked for authenticated actions. Historical members cannot grant access. | Accept invitation in a separate browser session; owner/admin/reviewer/viewer action matrix; revoked session; email delivery separately blocked on provider. |
| Notifications | Durable in-app event publication and read/unread/delete API. | Browser actions and refresh; multi-user ownership semantics. Company-scoped delivery preferences now persist with revision checks; email delivery remains unconfigured. |
| Slack/Stripe/Sheets | Connect handlers simulated successful authorization using timers. Removed those false success handlers during this audit; they now report missing provider configuration. | Real OAuth, persisted account identity, minimal scopes, verified webhooks, retries and disconnect/revocation. |
| Cashout | Found timer-based fabricated completed bank payout. Removed mutation and success notification during audit. Rates remain illustrative constants and historical records remain. | Provider selection, real quote/expiry, beneficiary validation, idempotent payout, signed webhook reconciliation and failed/reversed handling. |
| Cards/global accounts | Historical data persists; operational actions require provider configuration. | Provider sandbox onboarding, issuance/account creation, permissions and reconciliation. |
| USYC | Read adapter verifies official Arc Testnet Teller dependencies, holdings, oracle and permissions. Actual company/approval/vault addresses lack subscription permission. Panel removed from Earn at user's request; backend retained. | Implement approved reserve controller/request journal with liquidity and allocation bounds, fees/price bounds and exact allowances; obtain holder entitlement; verify small subscription and redemption. |

## Execution order

1. Fix durable notification preferences and remaining simulated integration state. Keep existing layouts; show concise errors only when actions cannot complete.
2. Verify browser invoice, contractor/payroll, reimbursement and team journeys, fixing server/UI discrepancies as found. Use clearly named test records; do not rewrite historical payments.
3. Run failure injection against isolated databases and mocked provider responses. Then perform one small authorized Arc Testnet journey and record receipt, event and business status evidence.
4. Complete reserve execution independently of the payment vault. USYC access is an external dependency for live mint/redemption testing, not a reason to count untested investment actions as finished.
5. Select external payout/card/account providers and implement their sandbox adapters. No bank/card feature is complete from a saved sample record.

## Evidence baseline

### October 12 follow-up

- Fresh reimbursement settlement verified: `Journey QA reimbursement review`, ID `259964ed-2dba-4ad7-81a2-853bb40f0492`, is Paid in the durable repository and browser. Arc RPC chain 5042002 confirms successful transaction `0xa64a5c756f340e989981c1d0ebadde7c9e9bb01e995030034cfec358af1566d2`, block 66716521, from company wallet `0x5807412f16da9077917270ebd157f30f2ab94da1`. Its USDC precompile transfer calldata sends 1000 six-decimal units (0.001 USDC) to `0xE487dD5D9cd9562678c759D1d82c0b8821Daa53e`. The user authorized adding this recipient to the direct company-wallet policy; max 0.001, daily 0.01 and one human approval remain unchanged. This verifies the direct reimbursement route, separately from the prior vault settlement.

- Receipt upload succeeded using `.data/journey-receipt.png` through the browser file chooser. `Journey QA receipt rejection` retained its PNG attachment after navigation/reload. Rejection was retried after session renewal, completed, and persisted after full reload; rejected claims expose no payment action. The earlier temporary-file failure did not reproduce with a stable workspace file; its exact cause is not established.
- Fixed reimbursement action click propagation: Approve/Reject no longer also opens the receipt preview.
- Added draft due-date and line-item editing to invoice detail. Edited existing QA draft `INV-1791621916023` (`7e049c7b-e7c5-450b-904f-c23941e7c3ff`) to `Journey QA draft edit verified`, 0.002 USDC, due November 12, 2026. All values persisted after full reload. Draft update totals now derive from quantity × unit price rather than trusting supplied line totals. Issued records retain their existing edit prohibition.
- All 108 automated tests passed. TypeScript passed after the draft editor and total-calculation changes. The reimbursement settlement above was performed by the user and verified read-only.

Outstanding: invalid/oversize/corrupt image browser checks, fresh external invoice collection and contractor settlement under authorized human control, failure/restart/route exclusion browser checks. The saved contractor test recipient is outside the current vault allowlist; its bill must remain blocked under that policy.

### Browser journey checks — October 11 follow-up

- Invoice `INV-1791738484939` (`a586cfc6-da7b-43de-9c03-233ab6d05120`): created a 0.001 USDC draft for Browser QA Client, verified after navigation/reload, issued from its detail screen, and downloaded the actual PDF. The downloaded document parses as one page with the correct invoice title. Fixed ambiguous preview date parsing, detail precision, draft timeline, misleading email-delivery wording and missing visible issue/download/preview-close controls. Draft editing and external payer settlement remain unverified.
- Contact creation previously hardcoded employee type. Added Contractor selection and verified `Journey QA Contractor verified` persists as a contractor (employee ID 7), with its group, wallet and saved terms. Removed fabricated payday 28 from the contact list. Contact routes now look up contracts by employee identity instead of treating employee IDs as contract IDs. Contacts without a contract receive a setup action that prefills their saved terms.
- Created payroll contract ID 3 for that contractor, 0.001 USDC, one period, payday 11. Preparing twice retained exactly one invoice `PAY-3-1`. Reviewing/confirming produced one pending bill `BILL-1791739795861`, due November 11. No payment was submitted. This recipient is not the existing vault-allowed recipient; do not relax policy to pay it during verification.
- Created `Journey QA reimbursement review`, 0.001 USDC, for the first test contact (ID 6; created before the contractor-type fix, so it remains an employee). Approved it and verified the approved state after full reload. It remains unpaid.
- Generated a disposable PNG receipt and selected it through the browser file chooser. Submitting the receipt claim failed with `Failed to fetch`, twice; no receipt claim was created. No matching upload POST appeared in the inspected server output. Root cause remains unresolved; attachment persistence, rejection and corruption/size checks are not browser-verified.
- Relevant repository/PDF suite: 12 tests passed. TypeScript passed after the contact routing/prefill fixes; repeat after any subsequent edits. Test records were retained for review. No new wallet signature or transfer was performed in this follow-up.

Remaining acceptance work: draft editing; receipt upload and rejection; fresh invoice collection and contractor/reimbursement settlement with explicit human wallet approval; route exclusion/retry/restart checks. These journeys are not yet fully verified end to end.

Browser follow-up: invoice Draft filtering returned the correct single draft after its request completed. The previous empty appearance was a loading-state problem; invoice list now shows loading and request errors explicitly and does not mark an empty selection as all-selected. Notification test recipient cleanup was confirmed in the browser. Full create/issue/payment verification remains pending.

Follow-up increment: notification preferences now persist per company, default to no recipients and disabled, validate and deduplicate addresses, and reject stale revisions. Owner/admin updates use authenticated same-origin requests. Email delivery remains unconfigured. Restored the missing Notifications entry in Settings. Repository tests cover persistence after reopening, company isolation, conflicting writes and invalid recipients. Browser saved a temporary `notification-test@example.invalid` recipient and verified it after full reload and renewed sign-in; the temporary recipient was then removed. All 107 automated tests pass. Draft payment refresh no longer claims the direct treasury route unless an existing direct payment is found.

Before this audit, 106 automated tests and TypeScript checks passed. Live Earn backend observation: company wallet 0x5807412f16da9077917270ebd157f30f2ab94da1 held 0 USYC and 19.968552 USDC, with subscription/redemption permission false. Funds held by the separate payment vault are not the company wallet balance. Subsequent verification results belong in the final work report.

### Invoice collection follow-up — October 12

- Found list/detail share URLs using `id` while the legacy public page expected `uuid`. More importantly, its invoice loader read browser-local sample data instead of the issued canonical record.
- Replaced the public server entry with an issued/paid canonical invoice lookup and redirect to its durable payment checkout; drafts, cancelled and unknown records cannot expose a collection link. Both existing `id` URLs and canonical `uuid` URLs are accepted.
- The issued QA invoice now resolves to checkout `d2f1056e-93fb-4e42-ab95-cb3f325b6179`, with 0.001 USDC payable to the configured company wallet on Arc Testnet. Fixed checkout total rounding that incorrectly displayed 0.00 USDC. No external payer submission has been made.

- Invoice collection receipt verified on Arc chain 5042002: transaction `0xd4e5f3655f0d8fcd2ddd4d8980b9c176996fc5bfda958e7091d2e302331db4e2`, successful at block 66719185, sends 1000000000000000 native base units (0.001 USDC) from `0xE487dD5D9cd9562678c759D1d82c0b8821Daa53e` to the company wallet. The existing durable link record contains this receipt; its recorded timestamp precedes this verification, so this is not claimed as a newly created transaction.
- Workspace reads previously projected invoice state without reconciling verified collection records. Added shared invoice reconciliation for the business-records API and workspace view, with a regression test for persistence after reopening, repeat reads and company isolation.

- Browser invoice detail now displays Paid after canonical reconciliation. Full suite: 109 tests pass.

### Conversational operations and MCP — October 12

The Finance agent now prepares supported record changes and opens their exact review automatically. Advanced controls moved to Settings. Owner-confirmed proposals are company/principal scoped, immutable, atomic and durable across restarts; ambiguous provider outcomes cannot be blindly retried. Existing route validators and contract limits remain authoritative. External MCP tools use explicit owner enablement and per-call review through remote HTTPS Streamable HTTP.

Browser: a real Azure request opened a draft invoice review and confirmation saved the canonical invoice without issuance or payment. Follow-up found the invoice list omitted canonical records without workspace links; projection and normal-screen action resolution were corrected, with a regression test for visibility, changed terms and deduplication. Final browser persistence verification is pending until production restart.

125 automated tests pass, including MCP initialization/JSON/SSE discovery, changed-definition consent invalidation, network guards, immutable action claims, future payment identity and relevant follow-up context. Production npm audit reports zero known advisories. The new condensed Circle approval-to-execution UI has not submitted an additional live payment; prior backend settlement evidence remains above.

Remaining gaps are explicit: USYC execution needs implementation as well as Circle entitlement; provider-backed fiat/cards/accounts need adapters and credentials; outbound MCP does not supply an inbound Settlbox server, OAuth or local stdio. Initial wallet setup and receipt uploads retain dedicated screens. This is not a claim that every application feature is operable through chat.

### Production confirmation — October 13

Final production build and TypeScript passed. All 126 automated tests pass, including the shared contact store regression: a chat-created contractor can create a real agreement, and an active agreement prevents deletion. The isolated production HTTP harness passed confirmed invoice create/issue/cancel, shared contractor create/prepare/confirm/pause, reimbursement create/approve/materialize, and schedule create/pause. It also passed canonical invoice visibility, stale-review rejection, duplicate confirmation, role/CSRF boundaries, receipt rejection, company isolation and restart persistence. No payment was submitted by these checks. The local production app and its existing workers were restored.

Browser confirmation after renewed sign-in: the Chat workflow verification invoice appears in the regular invoice list as a 0.001 USDC draft due November 12. Settings → MCP connections renders its endpoint and token-reference form; Finance controls is a separate Settings entry. Browser proofs are local ignored artifacts. No external MCP endpoint or credential was added during UI inspection.

### Typography restoration and chat receipts — October 13

Compared the original workspace typography: Inter normal 400/500/600/700 was configured, but Settlbox's layout no longer initialized its font variable. Restored locally hosted Inter, Geist Mono and existing Nanum Pen Script/Anton decorative styles, with official font licenses. Existing global responsive root sizes remain unchanged. New finance chat, review and MCP text uses fixed 14px body/input text, 12px captions and existing 26px bold page-heading styling so it does not shrink with the root font size.

Final production build and TypeScript passed. Browser computed styles verify Inter, a 26px weight-700 finance heading and 14px textarea. Receipt attachment UI rejected a corrupt old PNG fixture, accepted a valid fresh PNG through the existing authenticated upload route, and a real Azure request opened reimbursement review with the exact receipt URL/name and requested terms. The test proposal was dismissed; no reimbursement or payment was created. Receipt image text is not extracted or independently verified. The production app and existing workers are running with the restored fonts.

### Kora sandbox payouts — October 13

Added company-scoped test credentials, provider destination discovery, saved recipients, account resolution, immutable local-currency drafts, owner review and single-claim submission. Payout events persist through restarts. Unknown outcomes cannot be resent; status queries and signed webhooks reconcile the original reference and require matching amount and currency. Sandbox results never modify real business obligations. Live keys are rejected.

Real Kora test credentials returned Kenya's three mobile operators and 44 banks, Nigeria's 253 banks and Ghana's three mobile operators. Published Nigerian/Kenyan bank and Ghanaian mobile-wallet fixtures resolved. Kenyan mobile-money name resolution remains explicitly unsupported. Kora accepted KES, GHS and a correctly sized 1,000 NGN simulated payout; initial status checks showed processing, then subsequent provider queries matched each saved reference, local amount and currency and reached sandbox_success in all three markets. Provider-reported fees were 0 KES, 0 GHS and 32.25 NGN. Earlier 500 NGN tests were rejected by the provider's minimum and were not resent. These are simulated settlements, not real-money delivery.

The authenticated browser verified destination lookup, recipient saving, exact review details with visible authorization controls, and shared Cashout state. A real Azure chat request opened the operator lookup review and returned the three provider codes through the same dispatcher. Browser review evidence is private at .data/kora-payout-review.png. A browser fixture was authorized in the sandbox and later reconciled to sandbox_success in Cashout; no real funds moved. A separate real Azure request prepared a 100 KES draft for the saved recipient, verified pending_review, and the draft was cancelled without submission. Additional settlement proof is private at .data/kora-payout-success.png.

Verification: full regression suite passed 136 tests; subsequent focused checks include full-history duplicate protection. The isolated production harness verifies authentication, CSRF, live-key rejection, recipient verification, request idempotency, immutable authorization, duplicate prevention, uncertain-outcome recovery, chat dispatch and restart persistence. Final production build and webhook acknowledgement checks are recorded with the pull request. Secrets remain outside Git.

### Automatic payout status reconciliation — October 13

Added a status-only worker for existing Kora payout references, with durable claims, bounded batches, restart recovery and exponential backoff. A dedicated server-only token authorizes status checks and cannot submit payouts. The browser refreshes submitted payout status automatically while retaining manual checks and immutable pending reviews.

Verification: 142 automated tests pass, TypeScript and the production build pass, and the isolated production HTTP harness passes restricted worker capability, uncertain-outcome recovery and restart persistence. The configured local worker endpoint returned HTTP 200 with zero eligible checks. Authenticated browser inspection confirmed the automatic-check caption. No new payout was submitted during this increment. Live provider payouts and funding remain disabled.

### Cashout restoration and external access � October 13

Restored the previous Cashout amount field, receiving-currency selector, primary button and withdrawal history, preserving existing typography. Removed the embedded recipient/payout workflow and sandbox explanations. Removed payout-operation controls from Settings; provider configuration remains there and operations use Finance agent chat. Fixed sample FX rates, fees and fictional bank details were not restored. The Cashout button reports live unavailability and never submits funds.

The owner confirmed neither Kora live approval nor Circle USYC entitlement is available. Kora currently documents USDC receiving networks ETH, SOL and TRX, not Arc. Its stablecoin wallet guide does not establish an Arc-to-local-currency funding/FX route for this merchant. Live keys remain disabled. USYC still needs a reserve execution implementation, entitlement and separate subscription/redemption verification; access alone will not complete it.
