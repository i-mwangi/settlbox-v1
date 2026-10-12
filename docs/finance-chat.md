# Conversational finance

The Finance agent opens with a chat composer and starter questions. Each message prepares a current policy-checked plan through the next 30 days, using the existing planner. Azure answers the question and selects relevant saved obligations from a validated list. The response cannot create recipients, change amounts, grant permissions or submit payments. Invalid or unknown selections fail closed.

Conversation history persists in the business database and is scoped to company and authenticated principal. Retries reuse the original message ID and planning terms. The client discards conversation cache on unmount and keys it by principal. PINs, wallet authentication tokens and encryption keys are never written to conversation history.

Selecting Review payment opens a focused dialog. It loads the canonical recipient and amount, checks for changed or blocked records, prepares the existing vault request only on explicit user action, and offers Circle authorization when an on-chain approval is needed. The native dialog releases its top layer while Circle displays its secure PIN screen. Sending is a separate explicit action after verified approval; status checks reconcile without sending funds. Settlement links come from the durable payment journal.

Existing wallet setup, administration, automation controls and audit history remain under Wallet, automation and audit settings, loaded only when expanded. Invoice, bill, contractor and reimbursement workspace shortcuts remain available. This release does not claim that record creation/editing, policy administration or USYC investing can be performed by a chat message; those operations retain their existing interfaces and permissions.

Azure configuration uses the existing server-side environment values. No new credentials or secrets are needed. The implementation does not weaken contract limits, allowlisting, liquidity floors, approval requirements or owner-only payment execution.

Verification: 117 automated tests pass. Live Azure replies were checked for attention and vault balance questions. The blocked reimbursement opens a modal with its canonical recipient and no send action. Conversation history survived full browser reload. The new Circle approval modal is wired to the existing verified settlement services; no additional payment was submitted during chat UI verification.
