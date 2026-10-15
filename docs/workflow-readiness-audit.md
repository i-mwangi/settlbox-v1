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

### Fresh chat payment and external MCP verification - October 13

Created a 0.001 USDC draft bill through a real Azure chat request, saved its exact review and opened the simplified payment popup through chat. The owner completed Circle authorization. Reopening the popup showed Payment settled and recorded, with transaction 0x94ead19c5562747fbcf9997fd53a8207ca5a47fccca6710885f241c6dab2b1a6. An independent Arc Testnet receipt query verified success at block 67029741 and the vault PaymentExecuted event for exactly 0.001 USDC to 0xE487dD5D9cd9562678c759D1d82c0b8821Daa53e. No second payment was submitted. Browser proof is private at .data/chat-payment-settled-test.png.

All 143 automated tests pass. The isolated production workflow harness passed invoice, contractor, reimbursement, schedules, owner reviews, corrupt/oversize receipts, company isolation and restart persistence. The separate fiat harness passed recipient verification, immutable review, single submission, recovery, chat dispatch and restricted status-worker capability without contacting a financial provider.

Read-only USYC verification at Arc Testnet block 67029765 confirmed the Teller dependencies and unpaused entitlement contract, but the company reserve wallet cannot subscribe or redeem. USYC execution remains unimplemented. Kora live access/funding is unapproved; these live executions cannot be verified and remain disabled.

The owner requested ngrok for external MCP testing. A temporary loopback diagnostic server exposes only one fixed-message tool, without business-data or payment access. Real HTTPS discovery uncovered a Node socket lookup callback mismatch when address-list mode is requested. Fixed the pinned DNS callback to return the expected list or single-address shape, retaining public-address validation and avoiding a second DNS resolution. A regression test covers both callback modes and rejected private addresses. Real ngrok discovery passed after the fix; production browser verification follows below.

Production browser verification passed MCP connection creation, HTTPS discovery, explicitly enabling the single diagnostic tool, real Azure chat proposal, owner review and the returned fixed diagnostic text with isError false. Proof is private at .data/mcp-ngrok-success-test.png. The temporary connection was removed and ngrok/fixture processes were stopped afterward. This verifies an external Streamable HTTP diagnostic server, not an accounting provider, OAuth flow or inbound Settlbox MCP server. Final production build and TypeScript passed; the regular app remains on port 3002.

### Inbound MCP server - October 14

Added a separate authenticated stateless MCP endpoint at /api/mcp for external clients. Owner-created credentials are scoped to record reads and/or action proposals, hashed at rest, company/principal bound, expiring after 30 days and individually revocable. Member-owner credentials recheck current membership. Access is configured in Settings without forwarding operator cookies or provider credentials. Requests are bounded and rate limited; invocation audit metadata persists in the business database.

External requests use immutable existing agent proposals and appear in Finance agent for owner review. Supported mutations use the existing dispatcher and canonical preconditions. External clients cannot confirm, approve, queue or execute payments, change vault policy or invoke arbitrary outbound tools. Payment review requests return to the normal plan/chat and Circle authorization flow. Revocation blocks pending confirmations; it cannot undo already dispatched actions.

147 automated tests pass. An isolated production server and the official TypeScript MCP client passed initialization, discovery, scoped reads, immutable proposal retries, owner-only confirmation, stale-record rejection, payment handoff without execution, credential isolation/revocation, audit, size/origin guards and restart persistence. No financial provider or real payment was contacted. Authenticated browser verification confirmed the new Settings section, read/proposal scope controls and reachable creation button. No real-workspace credential was automatically created. Proof is private at .data/inbound-mcp-settings.png.

The server supports the 2025 Streamable HTTP protocol versions with bearer authentication. OAuth, stdio and the 2026-07-28 protocol are not implemented. OAuth-only hosted clients and specific Codex/Claude product UIs have not been verified; the client connection guide states these limits. No public tunnel or deployment was enabled for the inbound server. USYC and live fiat execution remain unchanged and unavailable.

Final verification: production build and TypeScript passed after origin hardening; the official-client HTTP harness passed again against that exact build. The application was restored on port 3002 and /login returned HTTP 200. Credentials remain an explicit owner setup action in Settings.

### 2026-10-14 — inbound MCP OAuth connector support

Added public OAuth discovery and dynamic client registration, owner sign-in/consent, S256 PKCE authorization codes, resource-bound one-hour bearer access and rotating refresh tokens. Refresh/code replay revokes the grant; Settings revocation blocks refresh. Existing payment authorization boundaries remain in force.

Validation: production build and typecheck passed; full suite 150 tests passed, followed by the added expired-code/grant test (four OAuth tests passed). Isolated production HTTP harness passed OAuth discovery, registration, consent/CSRF, PKCE, official MCP client access, refresh/revocation and all existing inbound tests. Public ngrok discovery returns the configured HTTPS issuer; unauthenticated MCP returns 401 with protected-resource metadata. OAuth sign-in UI inspected. Actual Claude connection still requires the owner to retry Connect and select permissions; not claimed verified.

### 2026-10-14 — paid transaction details

Fixed Transactions history opening details by row number instead of the saved UUID, and stopped truncating UUIDs that begin with digits. Missing records now render a message instead of an endless spinner. Settled business payments show exact saved amount, recipient wallet, Arc Testnet and recorded settlement hash; demo approvers and invented invoice lines are excluded from that panel.

Validation: production build including type checking passed; nine business-record and settlement tests passed. Browser check opened MCP payment test from History and verified Paid, 0.001 USDC, recipient and Arcscan transaction link. No payment was submitted by these checks.

### 2026-10-14 — restore platform styling

Restored live transaction detail cards, approvers section and adjacent progress column based on the original transaction layout. Uses real saved amount, recipient, required approval policy and settlement link; does not invent individual signer data. Narrow screens stack the columns.

Finance agent, its action/payment/wallet reviews, OAuth consent buttons and inbound/outbound MCP Settings now reuse the platform texture-button gradients, explicit 14px button typography, existing sidebar/close icons, neutral surfaces and modal header/backdrop treatment. Payment policy and authorization handlers are unchanged.

Validation: final production build and type checking passed. Browser inspected the restored paid MCP panel, agent conversation/review styling and MCP Settings. Final payment popup check encountered an expired session and kept authorization disabled; no payment or permission change was submitted. Proof images saved privately under .data/platform-*.png.

### 2026-10-14 — dashboard time scale and Finance agent icon

Dashboard balance range defaults to Day. Added rolling Minute and Hour views, and replaced categorical three-hour/month-name buckets with a numeric timestamp axis. Tick labels/density adapt to the visible duration, from seconds through clock times and calendar dates. Points use actual observation times; missing history is not synthesized. Change/flow values follow the selected range. Dashboard clock updates every 15 seconds and requests workspace refresh once per visible minute. Balance storage retains minute observations for the latest day and returns hourly summaries for older history without deleting existing records. Finance agent sidebar now uses the existing chat icon instead of Earn's chart icon.

Validation: four time-series/storage tests and two provider-history tests passed; production build including type checking passed. Browser verified default Day, Minute second labels, Hour clock labels, restored Day view and chat sidebar icon. Screenshot: .data/dashboard-day-adaptive.png.

### 2026-10-14 — native integrations

Implemented company-scoped encrypted Google Sheets OAuth, explicit preview/import of up to 100 drafts with stable source IDs, and RAW exports into a new spreadsheet. Slack supports a privately configured incoming webhook, explicit connection test, opt-in record-change notifications and a durable delivery audit. Stripe reads restricted-key snapshots of up to 100 customers, invoices and charges per category; no payment mutations or automatic/full-history synchronization.

All integration pages reuse platform cards and buttons. Google Sheets, Slack and Stripe include demo-based numbered How it works cards with accurate capability descriptions. Google import review uses readable fields instead of raw JSON.

Validation: 161 tests passed for the integration implementation; isolated production HTTP checks passed with mocked Google, Slack and Stripe responses. User screenshots confirm real Google OAuth connection, a successful sheet preview, and Slack reporting connection-test delivery. Real Sheets import/export and Stripe account access remain unverified. Stripe guide type checking passed.

### 2026-10-15 — real Slack transaction cards

Background record notifications now use structured Slack blocks within a coloured attachment, with real saved title, amount, status and record type. Unsettled records explicitly state no settlement hash is recorded. Paid records with a valid hash include a View transaction link to Arc Testnet explorer. User-controlled field values use plain_text to prevent Slack mention/markup injection. Delivery deduplication and uncertain-post handling remain unchanged.

Validation: four provider integration tests and type checking passed. Sent a structured card for the saved demo draft; user confirmed its appearance. User personally authorized 0.001 test USDC for Slack background delivery second test 2026-10-15. App reported settled; independent Arc RPC receipt returned status 0x1 for 0xcc534c3310eb51b699b94ba2f7610e9d29658ff384c490e23e66bf8e35d5ad15. Sent the paid card using the real saved record; user confirmed Paid, green border and transaction link. No additional payment was created or sent by the notification verification.

### 2026-10-15 — explainable agent planning and visible audit trail

Added saved deterministic cash-position evidence: existing commitments/liquidity floor, available cash before payments, eligible payments, blocked obligations and uncollected receivables. Existing earliest-due ordering and policy enforcement remain authoritative. Uncollected invoices are not spendable cash; blocked obligations are not deducted from the remaining-after-eligible-payments number. Chat receives this evidence and instructions to explain priority, protection, blocked reasons and forecast limitations.

Finance agent now exposes Financial decision summary and Agent audit trail. The latter shows the latest 30 user-scoped saved conversation turns, requesting principal/plan IDs, snapshots, proposal IDs, prepared timestamps and current available proposal state. Older unavailable proposal states are labelled as captured snapshots. It is application audit evidence, not an immutable event ledger or private model reasoning. Payment settlement still requires its receipt.

Validation: 163 tests passed, type checking and production build passed. Live analysis correctly identified two eligible 0.001 USDC bills, 0.001 USDC protected funds, 5.002 USDC blocked obligations and 10.001 USDC uncollected invoices. Browser verified deterministic summary and saved audit view. No payment or policy mutation was proposed by the analysis test. Proof: .data/agent-audit-trail.png.

Also investigated dashboard balance scope: it reads the company wallet rather than the separate payment vault. Observed company wallet 19.963963323588361304 USDC (displayed rounded as $19.96), vault 19.996 USDC; the confirmed Slack demo transaction interacted with the vault. No balance was artificially adjusted.
