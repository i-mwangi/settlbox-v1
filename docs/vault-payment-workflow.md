# Vault payment workflow

Finance agent plans now use the verified vault balance, current on-chain recipient permissions, payment and cumulative limits, contract liquidity floor and outstanding reservations. The additional reserve defaults to zero; the contract floor is always reserved separately. Existing plans retain their original funding source and cannot be used to queue vault payments. Preparing a plan sends no transactions.

An owner can queue an eligible outgoing obligation from a fresh vault-funded plan. A company-scoped stable payment ID binds it to the deployed vault and saved business record. The journal atomically reserves aggregate liquidity and freezes the draft in the same database transaction. The direct treasury route shares a route claim and cannot pay the same obligation. Invoice receivables and historical paid records cannot be queued.

Circle developer-controlled execution submits only `queuePayment` and `executePayment` with stable, separate idempotency keys. Ambiguous submissions remain reserved and are retried with the same terms and provider key. A provider failure requires review; it does not silently release the obligation for a different payment route. Worker or server restarts preserve the journal and provider IDs.

Use **Check chain status** after queueing. The saved recipient, amount and expiration must match the on-chain payment. Human approval is prepared in **Human approval wallet** and signed in Circle. The agent cannot sign the approver challenge. **Execute approved payment** requires the current on-chain approvals and rechecks vault identity, pause state and liquidity; contract limits remain authoritative.

Settlement is recorded as paid only after a successful Arc receipt, the expected executor and vault transaction identities, and a matching `PaymentExecuted` event are verified. The business record receives the transaction hash. Provider acceptance and PIN completion alone never mark it paid. The Finance agent panel shows persistent audit events and links to verified settlements.

Verification on October 11, 2026: 97 automated tests passed, including company isolation, changed records, paid-history rejection, cross-route duplicate prevention, aggregate reservations and contract ownership/policy/approval/replay behavior. A new 0.001 USDC bill, `d709de29-7cff-4dde-92be-fbf643818a94`, is saved as a draft for an actual test settlement. Live queue/approval/execution/reconciliation remain pending human activation and test funding. No settlement is claimed by these automated checks.

The signed-in Codex browser prepared and saved a vault-funded plan. It reported the actual zero vault balance and blocked the 0.001 USDC test bill for insufficient liquidity. The 0.002 USDC reimbursement remained blocked for its recipient, payment limit and liquidity constraints. An interrupted upstream request was retried without creating a payment or bypassing a block.

For this test, the vault needs at least payment amount + its 0.001 USDC floor + any additional reserve. The Circle executor separately needs native Arc Testnet USDC for transaction fees. Funds in the company treasury or approval wallet are not automatically funds held by the vault or executor.
