# Treasury vault

`SettlboxTreasuryVault` holds native USDC on Arc Testnet. All contract limits and amounts use 18 decimals, matching Arc's native balance interface. They must not be supplied as 6-decimal ERC-20 amounts.

The contract starts paused. The administrator configures allowed recipients and distinct approvers, then enables the vault. The execution wallet can queue and execute payments but cannot change policy, approve its own requests, grant roles, recover funds or unpause the contract. Administration transfers require acceptance by the new administrator.

Each queued payment binds its ID to a recipient, amount, deadline and policy version. Payments above the approval threshold require distinct on-chain approvers. Requests at or below the threshold can execute without approvals once enabled. The payment, UTC-day and lifetime budgets, retained-liquidity floor and current allowlist are checked at execution. Failed transfers roll back payment status and spending counters. Execution and recovery are protected against reentrancy.

Policy, recipient, approver, executor, pause and ownership changes invalidate earlier queued payments and approvals. Cancelled, expired and executed IDs cannot be queued again. A replacement business payment needs a new attempt ID linked to the original record by the server ledger; creating fresh IDs is not a substitute for checking duplicate business obligations. The agent integration must use this same ledger and reconcile `PaymentExecuted` receipts before marking a business record paid.

The administrator can recover funds only while paused. This intentionally lets the company regain its allocation in an emergency; the contract limits the executor, not the administrator. The administrator must remain under company control. Existing Circle treasury funds remain outside the vault unless explicitly allocated to its address. Contract safeguards apply only to assets held by the vault.

Compile with `npm run vault:compile`. The typed deployment adapter validates separate control wallets, Arc Testnet and decimal limits, and prepares constructor calldata without sending a transaction. The contract tests deploy the compiled creation bytecode in a local EVM and exercise transfers, approvals, limits, replay, role changes, rollback and reentrancy. These are local contract tests, not Arc deployment evidence or an independent security audit.

Keep administrator signing credentials outside the agent's reach. Different wallet addresses controlled by the same unrestricted agent API credentials do not provide this separation. The executor needs its own gas balance; vault value limits do not cap gas spent by an external execution wallet.

To prepare a reviewable deployment plan, create a local input JSON file with `chainId`, `administrator`, `executor` and a `policy` object containing `paymentLimitUsdc`, `dailyLimitUsdc`, `lifetimeLimitUsdc`, `approvalThresholdUsdc`, `liquidityFloorUsdc` (all decimal strings), and `requiredApprovals` (an integer). Run `npm run vault:prepare -- path/to/input.json`. This writes constructor calldata and hashes to `.data/treasury-vault-deployment-plan.json` without using credentials or submitting a transaction. Limits must be chosen explicitly; no allocation or spending limits are silently selected.

## Status configuration

After deployment, configure `SETTLBOX_TREASURY_VAULT_CONFIG` with a private JSON file, default `.data/treasury-vault.json`:

```json
{
  "chainId": 5042002,
  "companyId": "the company ID from the treasury configuration",
  "address": "the deployed vault address",
  "administrator": "the company-controlled administrator address",
  "executor": "the separate execution wallet address"
}
```

`GET /api/treasury/vault` requires workspace authentication. It returns `not_configured` when the file is absent. When configured, it verifies the company, RPC network, compiled runtime code and control wallets, and reads balance and policy at one block. Verification errors produce an unavailable response. The Finance agent page shows the observed status without enabling execution. Changes of administrator or executor require the local configuration to be updated before verification resumes.

Remaining integration: configure deployment identities and spending limits, deploy and verify on Arc Testnet, allocate a small test balance, connect durable request IDs and receipt reconciliation, and verify on-chain approvals and one settlement. Agent execution and USYC reserve operations remain disconnected.

Verified Arc Testnet deployment (2026-10-11): 0xedd29c469150b4c5eb71b17f29d99eb04de0d1b3. Runtime bytecode, administrator, executor, initial pause and all policy values were checked on chain. Confirmed policy: 0.001 USDC payment maximum, 0.01 daily and lifetime limits, approval threshold zero, one required human approval, 0.001 liquidity floor. No funds were allocated and no payment was executed. Administrator-controlled recipient and approver configuration remains pending. Use npm run vault:deploy to reconcile the journaled deployment; the same deployment identity is retained across retries.
