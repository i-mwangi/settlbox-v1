# Settlbox

Business accounts, payroll, invoices, and treasury management on Arc.

## Development

Use Node.js 24 or newer. Run `npm ci`, copy `.env.example` to `.env.local`, then run `npm run dev`.

The default network is Arc Testnet. Connect an EVM wallet through the dashboard and open `/transfer` to send native USDC. Transfers require wallet approval. A submitted transaction is not presented as confirmed settlement.

## Current capabilities

- Arc wallet connection, network selection, native USDC balance queries, and wallet-approved transfers.
- Exact integer accounting utilities and typed payment intents.
- Recipient allowlists, transaction limits, daily limits including reservations, and distinct approval counting.
- A payment orchestration interface requiring atomic authorization and reservation from its repository implementation.
- A SQLite treasury ledger with durable reservations, immutable idempotency bindings, approval records, and verified settlement transitions.
- Circle wallet provisioning and Arc Testnet payment execution through the official SDK.
- An authenticated testnet treasury at `/testnet-treasury`, with operator access at `/operator`.
- Durable invoices, bills, payroll, reimbursements, contacts, collections, and company records.
- Wallet-signed team invitations, distinct reviewer identities, role restrictions, and immediate session revocation.
- Atomic batch drafts, idempotent draft creation, private receipt uploads, and printable business documents.
- Durable payment schedules with bounded draft preparation, pause/resume, and occurrence history.
- Recipient-bound funded gifts on Arc, with confirmed claims and refunds after expiry.
- Server-persisted invoice presentation settings applied to printable invoices.

The connected wallet and Circle company treasury are separate accounts. Company disbursements pass through the configured treasury policy and approvals.

## Verification

Run `npm test` for financial policy, storage, and configuration tests. Run `npm run typecheck:arc` for the Arc and server modules, `npm run typecheck` for application diagnostics, and `npm run build` for the production build.

`npm run verify:circle` uses configured Circle credentials to provision isolated Arc Testnet wallets and verify a 0.001 USDC payment against chain receipts and the recipient balance. Request faucet funding separately with `npm run verify:circle -- --request-faucet`. The public Circle faucet is a fallback when the authenticated faucet is unavailable.

`npm run verify:api` tests a local running server at `http://127.0.0.1:3002`. It checks authentication, origin enforcement, approval, idempotency conflicts, Circle execution, on-chain settlement, durable history, and session revocation. It sends 0.001 test USDC to the configured approved verification recipient and persists its payment identifier to avoid repeated payments.

On October 9, 2026, 47 automated tests passed and the full application type check passed with zero errors. Live verification confirmed bill, payroll, reimbursement, incoming invoice, funded gift claim, and expired gift refund settlement on Arc Testnet. Workspace HTTP checks verify persistence, draft retries, signed invitations, private uploads, role restrictions, and session revocation. Production builds enforce TypeScript validation.

## Testnet workspace

The server reads `CIRCLE_API_KEY`, `CIRCLE_ENTITY_SECRET`, and a high-entropy `SETTLBOX_OPERATOR_TOKEN` from `.env.local`. Circle credentials are never required by the browser. Operator sessions expire after one hour and are stored as hashed tokens.

Treasury configuration lives in `.data/treasury-config.json`. It contains the company wallet reference, recipient allowlist, exact limits, approval threshold, and gas reserve. The initial configuration limits payments to 0.001 USDC, limits the daily total to 0.01 USDC, permits only the isolated verification recipient, and requires approval for every payment. Authenticated team reviewers have distinct approval identities.

The production server prepares due bill and payroll drafts on startup and once per minute while running. Each pass prepares at most 100 occurrences atomically. Run `npm run schedules:prepare` for a manual pass; preparation is also available in the scheduled payments screen. These operations do not release payments. Treasury review and approvals remain required.

Run `npm run contracts:compile` to compile the gift escrow, `npm run contracts:deploy` to deploy it through Circle Contracts using the isolated verification wallet, and `npm run verify:gifts` to reconcile the journaled test claim and refund. Deployment and verification identities are persisted under `.data` to prevent repeated funding on retries. The tested bytecode is pinned in `.data/gift-escrow.json`; wallet signing endpoints do not substitute for supported Circle contract deployment.

Use a persistent disk for SQLite. Multiple connections on one host are supported; a distributed deployment requires a shared transactional database. Mainnet company disbursements are disabled.

## Remaining integrations

- Scheduled reconciliation, provider event verification, and a reviewed recovery workflow for uncertain submissions.
- Fiat payouts, card issuing, and bank-account provisioning through configured providers.
- Crosschain liquidity, reserve products, and contract-enforced approval policies.
- Banking, cards, reserves, and Slack/Google Sheets/Stripe connections require configured providers and authorization. Their screens report the unavailable state and do not create sample transactions or claim successful connections.
