# Finance agent implementation

The first milestone adds a deterministic, proposal-only planning tool at `/agent`. It reads canonical business obligations and an observed Arc Testnet treasury balance. When Azure is configured, a server-side model reviews the deterministic plan. It cannot grant access, approve payments, subscribe to USYC or execute transfers.

Saved runs include the requesting principal, company, planning terms, observed balance and proposed record references. A company-scoped request ID binds retries to the original planning terms and returns the saved snapshot. Reusing an ID with different terms is rejected. Runs remain available after restart.

Only owners and admins can prepare plans. Existing authorized workspace access is required to read history. The UI restricts planning to the configured company treasury workspace. Plans exclude paid/cancelled records and records after the planning date. Incoming invoices are receivables, not available cash. Active payment workflows are blocked from a second proposal. Recipient restrictions, per-payment limits, cumulative daily commitments, active reservations, gas reserves and the requested liquidity reserve inform recommendations. Execution must always re-authorize against current treasury state. Plans reject a possibly truncated record set rather than silently understate obligations.

The following remain separate milestones:

1. Finish verification of invitation acceptance, team permissions, notifications and remaining edit workflows. Team presentation mutations now use the authorized member registry, with atomic bulk invitations and combined profile/role saves. Historical profiles remain read-only and cannot grant access. Invitations expose private sharing links; email delivery is not configured.
2. Extend the configured Azure advisory review with validated, narrow tools. Current reviews persist deployment identity, response ID, timestamp and narrative alongside the authoritative plan. Model-generated text remains advisory and is not executable.
3. Deploy and verify the compiled treasury vault on Arc Testnet after the company administrator and explicit limits are configured. Local EVM tests cover replay prevention, distinct approvers, payment/daily/lifetime limits, retained liquidity, pause, role changes, transfer rollback and reentrancy. The authenticated status endpoint verifies configured bytecode and identities; agent execution remains disconnected. Autonomous funds must be allocated to the vault for its controls to apply.
4. Integrate USYC holdings, entitlement checks and tracked Teller operations after the participating testnet wallet or vault is allowlisted.
5. Enable bounded execution only after authorization and failure-path tests pass.

Contract deployment, fund allocation and USYC subscriptions are not performed by the planning endpoint. Existing seeded financial history is excluded from its spendable balance.

Team directory and case-insensitive search were checked in the Codex browser. The invitation modal retains the existing layout and shows historical profile labels. Actual invitation acceptance and live role changes remain covered by repository tests, not a browser grant of new access.

Verification for this increment: 74 automated tests pass and the full TypeScript check passes. Local team API checks reject unauthenticated requests, negative historical member IDs, empty invitation batches and invalid origins without changing members. The Codex browser saved a new plan using observed Arc treasury funds, retained it after refresh and displayed the reimbursement block for an amount above the configured payment limit. No payment was submitted and no new member access was granted during browser verification.

Production build verification: `npm run build` completed successfully, including standalone packaging. The first sandboxed attempt compiled and type-checked but Windows denied a packaging directory creation; the retry outside the filesystem sandbox exited successfully.

Vault increment verification: 86 automated tests pass. The production build, including standalone packaging, completed successfully. The signed-in Codex browser displays the undeployed vault status and the preserved saved plan. The status API rejects unauthenticated requests and returns an honest not-configured response for the authorized workspace. No deployment, transfer or access grant was submitted. Administrator address received: 0xa2F8a545bD0FC4C2dCf2D7A71631803Cfb52FB01. Deployment preparation awaits a separately designated execution wallet and confirmation of proposed spending limits.

Azure integration: gpt-5-mini (2025-08-07), deployment settlbox-finance, GlobalStandard capacity 1, Switzerland North. o4-mini was rejected for new deployments as deprecating. Endpoint and key remain server-only in .env.local. Requests use store:false, a 60-second timeout, bounded output and no tools. Only minimized financial fields are transmitted; names, addresses, record IDs and titles are excluded. Azure failures do not create a successful saved run. Existing saved request IDs reuse persisted runs without another model call. Concurrent unsaved retries may still produce extra model requests before one canonical run is retained. 87 tests and TypeScript pass; a real Azure response and a browser-created persisted review were verified.

Azure increment production verification: npm run build completed successfully including standalone packaging. Browser review remained visible after refresh. No payment was submitted.
