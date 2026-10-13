# External assistants connecting to Settlbox

Settlbox exposes a stateless JSON Streamable HTTP MCP endpoint at `/api/mcp`. This is separate from outbound MCP connections, where Settlbox calls another server. The endpoint supports the 2025-03-26, 2025-06-18 and 2025-11-25 protocol versions and the initialize handshake. It does not implement the 2026-07-28 protocol, OAuth, stdio or an SSE notification stream. Clients must support the compatible protocol versions and configurable bearer authentication.

## Setup

1. Sign in as company owner. Open Settings → MCP connections → Connect an external assistant to Settlbox.
2. Create a separate named 30-day credential for each client. Choose read access, proposal access, or both. The credential appears once; save it privately in the client's environment. Settlbox stores its SHA-256 hash, not the plaintext credential.
3. Use `http://127.0.0.1:3002/api/mcp` for a client running on this computer. Remote clients need a reachable HTTPS deployment. A tunnel exposes the application publicly; configure authentication and the deployment origin before using it. No tunnel starts automatically.
4. Configure an HTTP `Authorization: Bearer <credential>` header. Credentials are never accepted in query parameters, cookies or ordinary business APIs.
5. Ask the client to list tools. Propose a draft, then review it in Finance agent → External assistant requests. Check its exact terms before confirming. Revocation prevents new calls and pending confirmations; it cannot undo an action already accepted or dispatched.

Codex configuration example (the token value must be in the environment of the Codex process, not this file):

```toml
[mcp_servers.settlbox]
url = "http://127.0.0.1:3002/api/mcp"
bearer_token_env_var = "SETTLBOX_INBOUND_MCP_CLIENT_TOKEN"
```

The environment variable above belongs to the external client, not Settlbox's server `.env.local`. Use the equivalent Streamable HTTP URL and bearer header configuration in other clients. OAuth-only hosted connectors are not supported by this implementation. Client-specific UI connectivity has to be verified separately; the official TypeScript MCP client is covered by the production HTTP harness.

## Tools and approval

- `settlbox_list_records`: up to 50 company invoices and payables, with saved status. Requires `records:read`. This is not a current balance or independent settlement proof.
- `settlbox_action_catalog`: supported action descriptions for argument construction.
- `settlbox_propose_action`: an immutable, expiring, company/owner-bound request. Supply a unique request ID; retries must contain exactly the same operation.
- `settlbox_proposal_status`: only proposals linked to the same credential.

Proposal access supports invoice/bill/payroll creation, draft editing, invoice issuance, cancellation, reimbursement creation/review/preparation, contractor agreement creation, payment schedules, payment links and requests to review existing payables. The endpoint never executes those changes. The owner confirms supported changes through the existing action dispatcher, which rechecks current records, permissions and validations. Proposed payment reviews return to the normal chat/plan and Circle authorization journey. They cannot approve a payment, queue it, submit it, change vault policy, enable automation or invoke arbitrary outbound MCP tools remotely.

Nothing is paid by creating a draft, issuing an invoice or requesting payment review. USYC and live fiat execution remain unavailable. Receipt uploads and wallet onboarding retain their dedicated screens. The operator's session cookie, Circle keys and provider credentials are never minted or forwarded to external clients.

## Controls and validation

Credentials are company scoped, owner bound, expiring and revocable. Member-owner credentials also recheck current membership and role. Origin checks, 64 KiB body limits and 120 requests/minute per credential apply. Tool invocations are audited without storing headers or raw tokens. Audit retention is bounded to 1,000 events per credential. The existing action audit records confirmation and outcomes.

Run `node --experimental-strip-types scripts/verify-inbound-mcp.mjs` after the production build. It uses an isolated database and official MCP client, with no real provider credentials or funds. Unit tests cover token hashing, scope boundaries, revocation, expiry, durable rate limits and malformed protocol messages.

References: [Codex MCP configuration](https://learn.chatgpt.com/docs/extend/mcp?surface=cli), [MCP 2025-11-25 transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports).
