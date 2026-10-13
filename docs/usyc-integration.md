# USYC on Arc Testnet

Earn reads real company wallet USYC holdings, the USDC ERC-20 interface balance, provider oracle valuation and entitlement checks at a single block. Contract addresses come from https://usyc.docs.hashnote.com/overview/smart-contracts. Interfaces were checked against verified Arc explorer implementation contracts on October 11, 2026.

The adapter verifies Arc chain 5042002 and the Teller's asset, share, oracle and authority dependencies before returning values. Native USDC uses 18 decimals for gas and transfers; its ERC-20 interface uses 6 decimals for Teller operations. USYC and oracle decimal scales are read from their contracts. Values remain decimal strings. No historical APY, sample balance or historical activity is treated as an on-chain reserve.

The tested company wallet `0x5807412f16da9077917270ebd157f30f2ab94da1` is not entitled to call Teller deposit. The human approval wallet and existing treasury payment vault were also not entitled. A nonzero maxDeposit is a balance/limit calculation, not proof of investor permission. The adapter separately checks Teller permission and token receiver permission. Chain failures return an unavailable state rather than assumed balances or access.

Subscriptions and redemptions remain disabled. This is a read integration, not a completed investment execution flow. Circle must grant appropriate Arc Testnet entitlements to the company reserve wallet before live testing. The current treasury vault can only make constrained USDC payments; it has no USYC strategy entry points. Do not grant it arbitrary contract execution or move its payment liquidity into a wallet outside those controls.

Remaining implementation: a dedicated reserve controller with human-authorized investments, obligation-aware liquidity floor, capped allocations, exact Teller allowances, price/fee bounds, persistent idempotent requests and reconciliation of subscription/redemption events and balances. Verify the controller's own entitlement before holding USYC there. Test mint and redemption separately once access is available. Provider permissions and wallet balances must be checked again when submitting.

No new keys or environment values are needed for read access. It uses the existing company treasury configuration and `NEXT_PUBLIC_ARC_RPC_URL`. Credentials remain server-side.

## Execution implementation sequence

Access is currently unapproved (owner confirmation, October 13). This does not make the execution code complete. The following work remains separate from the read adapter:

1. Implement a dedicated reserve controller using the verified Teller asset/share dependencies, capped exposure and a liquid USDC floor. The existing payment vault must retain its constrained payment interface. Use exact allowances, bounded minimum output, expiry, pause and replay protection; investments must require human authorization.
2. Persist immutable subscription/redemption requests and their policy, amount, quote and wallet identity. Revalidate balances, entitlements, current obligations and provider limits before submission. Unknown transaction outcomes must reconcile the same hash rather than resend.
3. Expose reserve proposals through Finance agent and the existing human authorization popup. Keep Earn's original interface and typography. Never present shares or estimated valuation as spendable USDC.
4. Test deposit/redemption, fees, price movement, expired approvals, allowance cleanup, pause, duplicates, interrupted workers and reverted transactions against isolated contracts. After entitlement, verify both subscription and redemption on Arc Testnet before enabling execution.

Mainnet execution requires separately verified chain configuration and production access. Testnet entitlement and addresses must never silently enable mainnet.
