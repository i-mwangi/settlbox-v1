# Reuse implementation progress

The restored presentation layer remains in place. Real password authentication and the Arc Testnet treasury backend remain the entry points for authenticated business operations.

## Implemented

- Payroll contracts persist in the existing business SQLite database and are scoped to a company and entity.
- Contracts require an active employee with a valid Arc address, positive USDC amounts with six decimal places or fewer, and valid calendar terms.
- Active contracts can prepare one invoice per monthly period. Duplicate requests return the existing invoice. Month-end dates clamp to the actual calendar.
- Invoice confirmation atomically creates one pending bill and one canonical payroll payment draft. Repeating confirmation returns the existing bill.
- Paused and cancelled contracts stop preparing new invoices. Prepared terms cannot be edited underneath an existing invoice.
- The scheduled-payment worker prepares due payroll invoices for review. It does not execute payments.
- Payroll create, edit, pause, resume, cancel, prepare and confirm actions use authenticated APIs. Imported payroll rows remain visible as history.
- Linked invoice and bill statuses follow canonical business settlement records. A submitted transaction hash does not create a completed transaction.
- Browser changes cannot alter or remove settled history, forge contract/payment links, or change server-linked financial terms.
- Record mutations send the revision they read, preventing a second read from hiding concurrent edits.
- Contact, client, employee, group and company profile mutations use persisted records and await saves. Changed master records receive server validation, including Arc addresses and employee group ownership.
- Employee forms accept Arc addresses. Employee enable/disable and invoice settings success messages wait for persistence.
- Company/avatar image uploads use the authenticated image endpoint rather than returning a sample avatar. Company logo changes are saved with the profile.
- Invoice and bill downloads return real PDF documents, include the supplied Settlbox logo, and paginate long item lists.
- Bill payment, cancellation and deletion adapters use the saved lifecycle. Bill filters and pagination use actual rows rather than returning the same sample collection for every tab.
- The notification panel reads authenticated, company-scoped notifications and persists read/unread state. Hidden notifications remain suppressed after their event is published again.
- Payroll invoice preparation and outgoing invoice issuance queue durable email events. Delivery is not configured and messages remain queued.

## Remaining in the recommended order

The subsequent Arc dependency audit corrected both layout providers, mock wallet state, contact chain IDs, token precision and wallet-picker wiring. See `arc-route-audit.md` for the route inventory and explicit unsupported workflows. Its 58 tests, full TypeScript check and production build passed; signed-in browser verification remains outstanding.

- Finish signed-in browser verification of the preserved screens. The test browser currently remains at the real email/password login, awaiting the user’s sign-in.
- Configure an email delivery provider before queued messages can be delivered. No emails have been sent.
- Implement additional recurring B2B invoice scheduling if that unused API surface is enabled in the UI; the implemented scheduler currently covers payroll periods and existing payment schedules.
- Keep provider-dependent cashout, cards and yield separate until their providers are configured.

The selected business workflow is verified through authenticated APIs. The complete signed-in browser journey has not yet been verified.

## Saved verification scenario

The Pods Finance workspace contains the employee `Arc workflow test`, payroll contract `1`, invoice `PAY-1-1`, and its bill for `0.001 USDC`. The authenticated HTTP verification prepared the invoice, confirmed the bill, requested treasury approval, and verified Arc Testnet settlement. Both invoice and bill now show paid, with one transaction. Repeating payment did not submit another transfer.

Confirmed transaction: `0xb09918d4b2e103829a1a946538929afe712a70268a1e7342e4d6865b3949ccc9`.

Run `node --env-file-if-exists=.env.local scripts/verify-payroll-workflow.mjs` to repeat saved-record, PDF and authenticated endpoint checks without sending funds. The script reuses the same contract and period. The `--settle` option verifies the same payment identity and its retry protection.

Verification includes 56 passing tests, a passing full TypeScript check, and authenticated HTTP checks for all three workspace entities. The final production build, including bill filters and pagination, passed. The authenticated master-data script also tested client create/edit, group create, employee create/disable, invalid input rejection, and removal of its temporary fixtures. The browser renders the real email/password login with the Settlbox logo.
