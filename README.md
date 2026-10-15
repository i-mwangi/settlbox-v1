# Settlbox

Settlbox is a stablecoin-native business finance platform for treasury, invoices, payroll and contractor payments. Its Finance agent helps operators understand obligations, prepare actions for review and coordinate authorized USDC payments on Arc.

The broader vision is a business account for global collections, payroll and USD treasury management. The current implementation is an **Arc Testnet prototype**. Live banking, fiat payouts, yield and universal onboarding eligibility are not represented as available services.

## How it works

1. Create an obligation manually, ask the Finance agent to prepare it, or import reviewed drafts from Google Sheets.
2. Ask what needs attention. The agent explains due-date priorities, protected liquidity, eligible payments and blocked obligations using saved records and current policy.
3. Review the proposed action. Payments require the applicable human wallet authorization and contract approvals.
4. Verify USDC settlement on Arc Testnet, with saved payment state and a transaction hash.
5. With Slack notifications enabled, the background worker posts structured record updates with a transaction link when a settlement hash is recorded.

Uncollected invoices are excluded from spendable cash. A completed action review does not itself prove payment settlement. Execution rechecks current balances, permissions and limits.

## Implemented capabilities

- **Finance agent:** conversational analysis and reviewed actions, saved conversations, financial decision summaries and a visible agent audit trail. Analysis is based on recorded obligations, not a forecast of unknown expenses.
- **Treasury:** Circle wallet integration, a contract-enforced payment vault, recipient allowlists, spending limits, liquidity protection, human approvals, durable reservations and idempotent payment handling.
- **Invoices and receivables:** saved invoices, branded printable documents, payment links, Arc USDC collection and settlement reconciliation.
- **Payroll and contractors:** employee/contractor records, agreements, bills and recurring schedules that prepare drafts. Scheduling does not bypass approval.
- **Expenses:** reimbursements, private receipt uploads, review and payment workflows.
- **Google Sheets:** OAuth connection, reviewed imports of up to 100 draft rows with stable source IDs, and exports of up to 1,000 saved records into a new spreadsheet. Import/export is explicit; automatic two-way sync is not implemented.
- **Slack:** incoming webhook connection, opt-in background record notifications, structured payment cards and a delivery audit.
- **Stripe:** restricted-key, read-only snapshots of the latest 100 customers, invoices and charges per category. Manual refresh; no payment mutations or automatic full-history sync. Real-account verification remains pending.
- **MCP:** authenticated access for external assistants to read supported context and propose actions for review, plus configurable outbound MCP connections. Assistants cannot bypass wallet authorization.
- **Access and records:** authenticated sessions, role restrictions, signed team invitations, durable business records and saved payment outcomes.

The company wallet and payment vault are **separate funding sources**. The current dashboard balance reads the company wallet; vault payments reduce the vault balance. Neither represents every asset held by the business.

## Verification

Live checks have verified Sheets draft import/export, agent analysis and review, user-authorized Arc Testnet USDC settlement, audit records and Slack background notifications. A paid Slack card was checked against an actual successful transaction receipt.

The latest recovery verification passed **166 automated tests**, application type checking and the production build. Failure-path tests cover read-only RPC failover, bounded Slack rate-limit retries and duplicate protection. An isolated live test recovered through the backup Arc RPC after its primary was deliberately made unavailable. Integration HTTP checks also use mocked providers; these do not establish live-provider readiness.

See [the readiness audit](docs/workflow-readiness-audit.md) for detailed evidence and limitations.

## Development

Use Node.js 24 or newer. Run `npm ci`, copy `.env.example` to `.env.local`, and privately configure the services you use. Never commit credentials, wallet secrets or local databases.

```sh
npm run dev -- --port 3002
```

For production, run `npm run build`, set the `PORT` environment variable to `3002` if desired, then run `npm start`. The production launcher starts configured schedule, finance and payout-status workers while the process remains running.

```sh
npm test
npm run typecheck
npm run typecheck:arc
npm run build
```

Setup guides: [Google Sheets](docs/google-sheets-setup.md), [Slack and Stripe](docs/slack-stripe-setup.md), and [.env.example](.env.example).

Circle credentials remain server-side. Operator sessions expire after one hour. Configuration, SQLite databases and private uploads live under `.data` by default. Preserve the integration encryption key and use persistent storage. Distributed deployments require appropriate shared transactional storage.

Scripts such as `verify:circle`, `verify:api` and gift deployment/verification can provision wallets, deploy contracts or send test funds when configured. Inspect their setup and payment terms before running them; they are not ordinary read-only health checks.

## Reliability and audit boundaries

Arc reads use bounded retries and a documented backup endpoint. Missing current chain data fails closed. Slack batches are paced; confirmed rate-limit rejections respect `Retry-After` with a three-attempt cap. Ambiguous deliveries remain uncertain and are not automatically resent. External outages remain possible.

The agent audit view exposes recent saved conversations, decision snapshots and available proposal states. These are application records, not an immutable event ledger or the model's private reasoning. Transaction receipts provide separate evidence of settlement.

## Access-dependent and unfinished capabilities

- USYC investment/redemption requires approved access and completed execution integration. No fixed APY is promised.
- Kora payout workflows are sandbox-only. Live funding, bank/mobile-money payouts and on/off ramps require provider approval and supported-market integration.
- Card issuing and bank-account provisioning require external providers.
- Cross-chain liquidity consolidation, FX conversion, broad counterparty screening, subscription usage monitoring and milestone releases are not demonstrated end to end.
- Sheets automatic two-way sync, Stripe real-account verification and complete integration-state awareness in chat remain unfinished.

Mainnet company disbursements are disabled. The prototype does not establish production compliance, global availability or eligibility without a particular legal entity.

## License

MIT. See [LICENSE](LICENSE). The original BuidlGuidl copyright notice is preserved.
