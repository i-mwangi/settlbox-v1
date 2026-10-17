# Settlbox

Settlbox is a stablecoin-native business finance platform that connects treasury, invoices, payroll and contractor payments to an AI Finance agent. It turns saved business obligations into policy-checked actions, authorized USDC settlement on Arc and a traceable record of what happened.

The broader vision is a business account for global collections, payroll and USD treasury management. The current implementation is an **Arc Testnet prototype**. Live banking, fiat payouts, yield and universal onboarding eligibility are not represented as available services.

## The problem

Small businesses and distributed teams manage cash, incoming invoices, bills and contractor payments in separate tools. Knowing a balance is not enough: an operator also needs to know what is due, which cash is already committed, what can be paid within policy and which decisions require attention.

Settlbox brings those obligations and payment controls into one workflow. Its current focus is explainable payment preparation and traceable execution, rather than replacing every bank account or accounting system.

## What the agent decides

| Decision | Evidence and boundary |
| --- | --- |
| Which obligations need attention first | Orders saved obligations by due date and explains eligible versus blocked items. This is a deterministic priority rule, not learned payment-timing optimization. |
| What cash is available for proposed payments | Uses the selected funding source, existing commitments, liquidity floor and additional reserve. Uncollected invoices are not cash. |
| Which payments must stop or escalate | Checks recipient permissions, payment limits, remaining daily capacity, liquidity and active workflows. The language model cannot override these checks. |
| Which business action to prepare | Resolves a supported operation from the conversation and saved context, then presents its exact terms for review. |
| Whether an execution can proceed | The server and contract recheck the saved payment and applicable approvals. An enabled worker can reconcile and execute already-ready payments within policy; it cannot create human signatures. |

The model explains and proposes; deterministic checks and contract rules enforce authority. The current prototype does not independently negotiate vendor terms, screen sanctions, infer milestone completion or optimize yield.

## How it works

1. Create an obligation manually, ask the Finance agent to prepare it, or import reviewed drafts from Google Sheets.
2. Ask what needs attention. The agent explains due-date priorities, protected liquidity, eligible payments and blocked obligations using saved records and current policy.
3. Review the proposed action. Payments require the applicable human wallet authorization and contract approvals.
4. Verify USDC settlement on Arc Testnet, with saved payment state and a transaction hash.
5. With Slack notifications enabled, the background worker posts structured record updates with a transaction link when a settlement hash is recorded.

Uncollected invoices are excluded from spendable cash. A completed action review does not itself prove payment settlement. Execution rechecks current balances, permissions and limits.

## Verified workflow example

A saved test bill for **0.001 USDC** was prepared through the Finance agent, reviewed in Settlbox and authorized by the operator. It settled on Arc Testnet, was recorded as paid, and produced a Slack card with the actual transaction link:

[View the verified Arc Testnet transaction](https://testnet.arcscan.app/tx/0xcc534c3310eb51b699b94ba2f7610e9d29658ff384c490e23e66bf8e35d5ad15)

The broader rehearsal also verified Google Sheets draft import/export and an analysis that distinguished eligible bills, protected liquidity, blocked obligations and unpaid invoices. These are engineering verification results using test assets; they are not evidence of commercial payment volume or customer adoption. Public customer-adoption metrics are not reported here.

To explore the workflow in a configured workspace, ask:

- “What needs attention, which bills are eligible for review, and why are the others blocked?”
- “How much cash is protected, and what remains after the eligible payments?”
- “Prepare a draft bill for [counterparty] for [amount] USDC, due [date], to [wallet]. Do not pay it.”
- “Open payment review for [saved bill title]. Keep its amount and recipient unchanged.”

Use the actual saved record names and permitted recipients. Review exact details before authorizing. Open **Financial decision summary** and **Agent audit trail** on the Finance agent page to inspect the saved evidence. Live use needs configured wallets and providers; cloning the repository alone does not provision them.

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

## Architecture

The dashboard, Finance agent and manual screens share server-side business records. The language model proposes supported operations; deterministic policy checks, explicit reviews and contract rules govern execution.

```mermaid
flowchart TB
    Operator[Business operator] --> UI[Next.js dashboard and Finance agent]
    Assistant[External MCP assistant] --> MCP[Authenticated inbound MCP server]

    subgraph Server[Settlbox server]
        API[Authenticated API routes and role checks]
        Planner[Deterministic planner and policy checks]
        Chat[Chat orchestration and reviewed proposals]
        Journal[Payment orchestration and reconciliation]
        Workers[Schedule, finance and payout-status workers]
        Integrations[Sheets, Slack, Stripe and outbound MCP adapters]
        Store[(SQLite business records, plans, proposals and payment journals)]
        Private[Private receipts and encrypted integration credentials]
        MCP --> API
        API --> Chat
        API --> Planner
        Chat --> Planner
        Chat --> Store
        Planner --> Store
        API --> Journal
        Journal --> Store
        Workers --> Journal
        Workers --> Integrations
        API --> Integrations
        Integrations --> Store
        Integrations --> Private
    end

    UI --> API
    Chat <-->|Bounded context and proposed operation| Azure[Azure OpenAI]
    UI <-->|User completes secure authorization| CircleUser[Circle user-controlled wallet]
    Journal --> CircleExecutor[Circle execution wallet]
    CircleUser --> Vault
    CircleExecutor --> Vault
    Journal --> RPC[Primary and backup read-only Arc RPC]
    RPC --> Arc[Arc Testnet]
    Vault[Policy-controlled treasury vault] --> Arc
    Company[Separate company wallet] --> Arc
    Arc --> Recipient[Recipient receives USDC]
    Integrations <--> Sheets[Google Sheets]
    Integrations --> Slack[Slack incoming webhook]
    Integrations --> Stripe[Stripe read-only API]
    Integrations <--> Remote[Enabled external MCP tools]
    Integrations <--> Kora[Kora sandbox payouts]
```

**Boundaries:** model output is not payment authorization. Wallet PINs and private keys are not supplied to the model. Server credentials stay out of browser configuration. The vault and company wallet are separate addresses and balances. Stripe snapshots and Kora sandbox balances do not become spendable Arc funds. External MCP tools require review and remain subject to their configured permissions.

### Agent payment sequence

This is the implemented vault-payment path. Manual record entry and reviewed Sheets imports can create the same saved obligation before the conversation begins.

```mermaid
sequenceDiagram
    actor User as Business operator
    participant UI as Finance agent UI
    participant API as Settlbox server
    participant AI as Azure OpenAI
    participant DB as SQLite records and journals
    participant Circle as Circle wallets
    participant Vault as Arc Testnet vault
    participant Worker as Background worker
    participant Slack as Slack channel

    User->>UI: Ask to review a saved payable
    UI->>API: Authenticated chat request with request ID
    API->>DB: Read obligation, conversation and saved workflow
    API->>Vault: Read current balance, policy and approvals through RPC
    API->>API: Compute eligible and blocked actions
    API->>AI: Bounded context and deterministic plan
    AI-->>API: Answer and proposed supported operation
    API->>API: Validate operation and bind saved terms
    API->>DB: Save plan, conversation and proposal
    API-->>UI: Show exact payment review
    User->>UI: Authorize the displayed payment
    UI->>API: Prepare or resume queued payment
    API->>Circle: Submit contract queue request
    Circle->>Vault: Queue obligation
    opt Contract requires a human approval
        API->>Circle: Create approval challenge
        Circle-->>UI: Secure wallet authorization screen
        User->>Circle: Complete authorization privately
        Circle->>Vault: Record approval
    end
    UI->>API: Reconcile and execute when ready
    API->>API: Recheck saved terms, policy and workflow state
    API->>Circle: Execute queued payment
    Circle->>Vault: Execute within contract rules
    Vault-->>API: Reconciliation verifies settlement receipt and event
    API->>DB: Save paid state and settlement hash
    API-->>UI: Show settlement result and explorer link
    Worker->>DB: Find new or changed record versions
    Worker->>Slack: Post structured paid card and transaction link
    Slack-->>Worker: Delivery acknowledgement or failure
    Worker->>DB: Persist delivery outcome and retry metadata
```

The enabled finance worker can also execute already-ready payments within policy. It cannot supply human signatures. Slack notification processing is independent of the finance cycle, and an uncertain notification is not automatically resent.

### Repository map

| Location | Responsibility |
| --- | --- |
| `app/agent/` | Conversation, action/payment reviews, decision summary and audit UI |
| `presentation/` | Dashboard, manual workflows, Settings and shared components |
| `app/api/` | Authenticated business, payment, integration and MCP endpoints |
| `services/arc/` | Exact amounts, deterministic planning and payment policy utilities |
| `services/server/` | Persistence, agent orchestration, wallet/provider adapters and reconciliation |
| `contracts/` | Treasury vault and gift escrow contracts and artifacts |
| `scripts/` | Production launcher, background workers and verification scripts |
| `tests/` | Policy, persistence, authorization, recovery and integration tests |
| `docs/` | Setup guides and verification history |
| `.data/` | Private local runtime configuration, databases, uploads and verification artifacts; not source-controlled |

## Verification

Live checks have verified Sheets draft import/export, agent analysis and review, user-authorized Arc Testnet USDC settlement, audit records and Slack background notifications. A paid Slack card was checked against an actual successful transaction receipt.

The latest recovery verification passed **166 automated tests**, application type checking and the production build. Failure-path tests cover read-only RPC failover, bounded Slack rate-limit retries and duplicate protection. An isolated live test recovered through the backup Arc RPC after its primary was deliberately made unavailable. Integration HTTP checks also use mocked providers; these do not establish live-provider readiness.

See [the readiness audit](docs/workflow-readiness-audit.md) for detailed evidence and limitations.

## Development: clone, configure and run

### 1. Install prerequisites and clone

Use **Node.js 24 or newer**, npm and Git. The server uses Node's built-in SQLite API; a separate SQLite service is not needed. Run commands from the repository root.

```sh
git clone https://github.com/i-mwangi/settlbox-v1.git
cd settlbox-v1
node --version
npm --version
npm ci
```

### 2. Create the local environment

Copy the template once. Do not overwrite an existing configured environment.

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env.local
New-Item -ItemType Directory -Force .data
```

**macOS/Linux:**

```sh
cp .env.example .env.local
mkdir -p .data
```

Edit these local-origin settings in `.env.local` for the port used below:

```dotenv
NEXT_PUBLIC_ARC_ENVIRONMENT=testnet
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.io
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3002
NEXT_PUBLIC_SERVER_URL=http://127.0.0.1:3002
SETTLBOX_APP_ORIGIN=http://127.0.0.1:3002
```

Use the same hostname consistently; `localhost` and `127.0.0.1` are different browser origins. Restart after changing server variables; rebuild after changing `NEXT_PUBLIC_` values in production.

Generate separate random values for `SETTLBOX_OPERATOR_TOKEN`, `SETTLBOX_FINANCE_WORKER_TOKEN` and, if using integrations, `SETTLBOX_INTEGRATION_ENCRYPTION_KEY`. Run the following once for each value and copy the output privately into its setting:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Keep `.env.local`, wallet credentials, tokens and `.data` private. Preserve the integration encryption key: replacing it makes previously encrypted provider credentials unreadable.

### 3. Configure workspace sign-in

There are no shared default login credentials. After creating `.env.local`, use the interactive PowerShell helper (`pwsh` also works where PowerShell is installed):

```powershell
powershell -NoProfile -File scripts/configure-auth.ps1
```

It prompts for your email and a hidden password of at least 12 characters, then writes `SETTLBOX_LOGIN_EMAIL` and a salted password hash to `.env.local`. It does not store the plaintext password. Do not put your password in a committed file or shell command. The underlying `scripts/configure-auth.mjs` also accepts a JSON object containing `email` and `password` through standard input for a private setup tool.

### 4. Configure the company treasury

Starting the server does **not** provision a company wallet or payment vault. Authenticated workspace operations require a company treasury configuration at `SETTLBOX_TREASURY_CONFIG` (default `.data/treasury-config.json`). Use a Circle Arc Testnet wallet you control and its real wallet ID/address. Keep the company ID stable across the workspace, vault and executor configuration.

The file has this structure; replace the wallet placeholders before use. The zero limits and empty allowlist below intentionally permit no outgoing payments:

```json
{
  "wallet": {
    "id": "YOUR_CIRCLE_ARC_TESTNET_WALLET_ID",
    "companyId": "YOUR_STABLE_COMPANY_ID",
    "address": "YOUR_FULL_ARC_TESTNET_WALLET_ADDRESS",
    "chainId": 5042002
  },
  "gasReserveBaseUnits": "0",
  "policy": {
    "allowedRecipients": [],
    "maxPaymentBaseUnits": "0",
    "dailyLimitBaseUnits": "0",
    "approvalThresholdBaseUnits": "0",
    "requiredApprovals": 1
  }
}
```

Choose recipients, gas reserve and spending policy explicitly before enabling disbursements. These configuration amounts use **18-decimal native USDC base units**; 0.001 USDC is `1000000000000000`. The vault has its own separately enforced policy and balance. A sample address or copied verification configuration does not establish ownership or spending authority.

For configured Circle operations, set server-only `CIRCLE_API_KEY` and the registered `CIRCLE_ENTITY_SECRET`. Human approvals additionally need `NEXT_PUBLIC_CIRCLE_APP_ID` and the appropriate user-controlled wallet API key. Follow [Circle executor setup](docs/circle-executor-setup.md), [treasury vault setup](docs/treasury-vault.md), [human wallet approvals](docs/human-wallet-approvals.md) and [the payment workflow](docs/vault-payment-workflow.md) before attempting settlement. Wallet/vault provisioning and test funding are separate from ordinary application startup.

### 5. Run the development server

```sh
npm run dev -- --hostname 127.0.0.1 --port 3002
```

Open [workspace login](http://127.0.0.1:3002/login), sign in with the credentials created above, then open [Dashboard](http://127.0.0.1:3002/) or [Finance agent](http://127.0.0.1:3002/agent). Stop the foreground server with **Ctrl+C**. Development output is stored in `.next-dev`.

`npm run dev` does not launch the background workers used by `npm start`. To test the finance/Slack worker in development, run this in a second terminal with the same port and configured worker token:

**PowerShell:**

```powershell
$env:PORT='3002'
npm run agent:worker
```

**macOS/Linux:**

```sh
PORT=3002 npm run agent:worker
```

The worker loads `.env.local`. Finance automation and Slack notifications still require their individual Settings controls to be enabled. Use production startup below to exercise all configured launcher workers together; do not run a duplicate finance worker alongside it.

### 6. Configure the agent and optional integrations

Configure only the features you intend to use. Empty provider settings do not become working services merely because the UI is visible.

| Feature | Configuration and setup |
| --- | --- |
| Finance chat | `SETTLBOX_AI_PROVIDER=azure`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`, server-only `AZURE_OPENAI_API_KEY`; see [Finance chat](docs/finance-chat.md). |
| Google Sheets | Google OAuth client, encryption key and exact callback URI; see [Sheets setup](docs/google-sheets-setup.md). Connect your account in Settings. |
| Slack | Server-only `SETTLBOX_SLACK_COMPANY_WEBHOOK_URL`; connect, test, then explicitly enable notifications in Settings. See [Slack setup](docs/slack-stripe-setup.md). |
| Stripe | Server-only restricted read key `SETTLBOX_STRIPE_COMPANY_READ_KEY`; see [Stripe setup](docs/slack-stripe-setup.md). |
| External AI assistants | Authenticated `/api/mcp`; local bearer clients or compatible hosted OAuth clients. See [MCP setup](docs/inbound-mcp.md). |
| Fiat payouts | Kora sandbox configuration only; see [fiat payouts](docs/fiat-payouts.md). |
| Gifts | Separate deployed and verified escrow configuration at `SETTLBOX_GIFT_ESCROW_CONFIG`; inspect gift scripts before provisioning or funding. |

For a hosted MCP client, expose the local app through a configured HTTPS deployment or an explicitly started tunnel, for example `ngrok http 3002`. Set `SETTLBOX_OAUTH_ISSUER` to that public HTTPS origin and include it in `SETTLBOX_ADDITIONAL_APP_ORIGINS`, then restart the app. The connector URL is `https://YOUR_CURRENT_HOST/api/mcp`. Keep the local app origin for local browsing; never publish your own tokens or reuse someone else's tunnel hostname. A changed tunnel origin requires updating configuration and reconnecting the client.

### 7. Build and start the production server

Stop the existing server before rebuilding, particularly on Windows where generated standalone files may be locked. Keep `.data` and `.env.local` intact.

```sh
npm run build
```

Then start the built application:

**PowerShell:**

```powershell
$env:PORT='3002'
$env:HOSTNAME='127.0.0.1'
npm start
```

**macOS/Linux:**

```sh
PORT=3002 HOSTNAME=127.0.0.1 npm start
```

The build generates `.next/standalone`; `npm start` loads `.env.local` and runs the standalone server with the configured schedule, finance and payout-status workers. Workers operate only while this process remains running and their required settings are present. See [finance automation](docs/finance-automation.md) for execution controls. **Ctrl+C** stops the foreground process. Rebuild after source changes before restarting production.

### 8. Validate the installation

```sh
npm test
npm run typecheck
npm run typecheck:arc
```

A production build is also a required check: `npm run build`. For a basic UI check, log in, open Dashboard, create one intended draft and reopen it. A loaded page or saved draft is not proof of provider connectivity or payment settlement.

Scripts such as `verify:circle`, `verify:api`, deployment scripts and gift verification can provision wallets, deploy contracts or send test funds when configured. Inspect their setup and payment terms before running them; they are not ordinary read-only health checks.

### 9. Troubleshooting and persistence

- **Port already in use:** stop the server already using 3002, or choose another port and update origins/callbacks consistently.
- **Login not configured or session expired:** run the sign-in helper if needed, restart, and sign in again. Operator sessions expire after one hour.
- **Treasury configuration missing:** configure your own wallet registry in step 4. Cloning does not copy the private configured workspace used in demonstrations.
- **RPC or wrong-network error:** use Arc Testnet chain ID `5042002`; check app and external wallet RPC settings separately. The app's backup read endpoint is configurable through `SETTLBOX_ARC_BACKUP_RPC_URL`.
- **No background Slack delivery in dev:** run the finance worker with the matching port, configure its token, and enable Slack notifications in Settings. A connection test does not prove the worker is running.
- **Windows build cannot replace generated files:** stop the local application before rebuilding. Do not delete runtime databases to fix a build error.

SQLite databases, configuration, encrypted credentials and private receipt uploads live under `.data` by default; application repositories initialize their database tables when used. Preserve this directory and the encryption key across restarts/deployments. Use persistent storage. Distributed deployments require appropriate shared transactional storage rather than independent local database copies.

[Documentation index](docs/README.md) · [Environment template](.env.example)

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
