# Conversational finance

The Finance agent is a chat interface. A supported request opens a focused review automatically. Changes use immutable server-side proposals; a model response never applies a change by itself. The review shows proposed arguments and the current saved record. Owners confirm changes; payment and vault approvals use Circle's secure screen. PINs and recovery answers never enter the conversation.

Supported operations include draft invoices and bills, issuing/cancelling invoices, contacts and company settings, contractor agreements and generated bills, reimbursements, recurring schedules, collections and payment links, notification preferences, team records, treasury permissions and bounded finance automation. Existing validators and authenticated route handlers remain authoritative. Payment requests resolve one canonical payable record, recheck current policy, and resume an existing journal entry rather than duplicate it. Future-dated requests prepare a plan tied to that exact record.

For a payment, the user authorizes the exact recipient and amount in the popup. The interface queues, requests Circle approval where required, waits for verified on-chain approval, then submits execution under that explicit authorization. Closing the review or reloading stops automatic continuation. A saved pending payment can be resumed after reviewing it again. Reconciliation does not submit payments. Paid status requires verified durable settlement.

Advanced wallet setup, administration, automation settings and audit records are in Settings → Finance controls. The normal agent page contains the conversation and composer. History and proposals persist per company and authenticated principal. Proposal claims are atomic; changed records invalidate approval, duplicate confirmations cannot repeat an action, and unknown external outcomes stay unresolved rather than being blindly retried.

## Connected tools

Settings → MCP connections supports outbound remote MCP servers using HTTPS Streamable HTTP through the official TypeScript client. Owners save a public HTTPS endpoint, discover its tools, and enable individual tools. Changed endpoints or tool definitions lose prior permission. Every external call opens a review showing its input. External text and descriptions are untrusted data.

Bearer credentials use an environment-variable reference, for example SETTLBOX_MCP_ACCOUNTING_TOKEN; secrets are not stored in settings or chat. Only public port 443 endpoints are supported. Private, loopback, metadata and reserved addresses, redirects, URL credentials and query-string secrets are rejected. DNS results are validated and pinned. Payload sizes, schema complexity and request durations are bounded. Calls recheck enablement before submission.

This is an MCP client, not an inbound Settlbox MCP server. Local stdio and OAuth authorization are not supported. No customer external endpoint has been supplied for a live integration test; protocol and permission checks use an isolated fixture.

## Configuration and limits

Azure uses server-side environment configuration. The configured deployment is settlbox-finance-chat; the public example contains no credentials. Azure produces structured proposals with no side-effect tools. Missing details require clarification; arbitrary URLs, shell commands and invented financial IDs are rejected.

The catalog does not cover every application feature. Initial wallet/PIN setup and ownership migration retain dedicated controls. Receipt uploads use the reimbursement interface. Card issuance, fiat banking, global accounts, on/off ramps and email delivery require actual provider adapters and credentials. USYC subscription/redemption execution is not implemented: entitlement is necessary but does not replace the missing approved reserve workflow. The payment vault cannot invest in USYC. Historical records do not prove live provider support or spendable funds.

Verification records belong in workflow-readiness-audit.md. An untested interface must not be described as a completed live financial journey.
