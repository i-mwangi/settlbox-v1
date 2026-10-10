# Browser workflow verification

Tested October 10, 2026, in the signed-in Codex in-app browser at http://127.0.0.1:3002, using the Pods Finance workspace. The original presentation screens were retained. No new blockchain payment or outbound email was submitted during this pass.

## Confirmed

| Workflow | Browser evidence |
| --- | --- |
| Group creation | Created Browser QA 2026-10-10; visible after refresh. |
| Employee creation | Created Browser QA Employee with browser-qa@example.test, the allowed Arc address and USDC; visible after refresh. |
| Client creation | Created Browser QA Client with browser-client@example.test; visible after refresh. |
| Invoice draft | Saved INV-1791621916023 for 0.001 USDC; visible after reopening the list, with Draft status. |
| PDF download | Browser downloaded invoice-INV-1791621916023.pdf; local file has a PDF-1.7 header and 1822 bytes. Visual document layout was not reviewed in this pass. |
| Payroll creation | Created contract 2 for Browser QA Employee, 0.001 USDC monthly, one month, payday 10. Detail page loads the saved address and amount. |
| Bill filtering | Paid filter displayed only the confirmed 0.001 USDC payroll bill. |
| Existing settlement display | BILL-1791563761411 opened as Paid with Arc Testnet and USDC metadata. This checks an existing settlement, not a new transfer. |
| Settings rendering | Company and invoice preferences rendered; company changes were not submitted. |

## Failures and gaps

1. The invoice Draft tab retained paid rows after loading. Its visible count became four instead of the one saved draft. Evidence: browser-evidence/invoice-draft-filter.jpg.
2. The newly saved invoice displayed Client instead of the entered Browser QA Client recipient name.
3. Invoice and payroll document previews round 0.001 USDC to 0.00. The invoice preview also labels its token USD while the form/list use USDC. The underlying saved list amount remains 0.001.
4. Payroll contract 2 shows Core Team and Engineering in detail, although its employee belongs to Browser QA 2026-10-10. Evidence: browser-evidence/payroll-detail.jpg.
5. The payroll detail page did not expose a visible invoice-preparation control during this walkthrough. New-contract preparation, confirmation and payment were not verified through the browser.
6. Console capture contained repeated Maximum update depth exceeded errors during this pass. The source component has not been isolated; do not attribute these to a specific page without a stack trace.
7. Two historical employee records still display old-format wallet addresses; a historical secondary account displays an incomplete EVM address. They are not usable Arc destinations and should not be treated as validated new recipients.
8. Workspace loading temporarily shows zero balances, no records and Loading company state before the server response. Some reads took around 15 seconds in development.
9. Invoice Save Settings was clicked with unchanged values; no completion message was observed before navigation. This is not a confirmed mutation test.

Notifications/read state, email outbox delivery, uploads, company-profile mutations, edit/disable flows, pause/resume/cancel, entity switching and new settlement were not verified through the browser in this pass. Existing automated/API results are separate evidence and do not establish browser success.

## Retained test records

The group, employee, client, draft invoice and payroll contract above remain saved for inspection. No cleanup deletion was performed. The payroll is a saved application record; no funds were sent for it.

The browser findings mean the complete user journey is not yet verified end to end. Fix the failures and repeat the affected journeys before describing it as complete.

## Invoice document correction, October 10

The downloadable invoice now uses a structured A4 layout with issuer, recipient, payment details, item table, totals and pagination. The browser bill layout adapts to available width and the issuer footer no longer expands across the entire invoice. Browser inspection of BILL-1791563761411 confirmed that unit price, amount, subtotal and total display 0.001 USDC instead of 0.00. The actual invoice download was opened and rendered for visual inspection. Invalid historical account addresses are excluded from PDF payment instructions. New invoices retain issuer contact details and the supplied payment wallet. Existing incomplete records are not populated with invented contact information.

65 automated tests pass, including USDC precision and PDF pagination. Evidence: browser-evidence/invoice-preview-corrected.jpg and ../output/pdf/invoice-preview.pdf. These corrections do not close the unrelated workflow findings above.

## Fresh workflow verification, October 10

Draft invoice filtering and the saved-client display name are corrected. Payroll employee lookup now uses the employee ID, preserving the saved group. Payroll detail exposes invoice preparation and review using the existing modal design. The review creates a bill from the saved invoice, and the payment confirmation uses its saved payment wallet. Proposal display respects USDC token decimals. Approval now reconciles the business record after treasury execution; processing payments expose Refresh status.

Browser verification prepared PAY-2-1 from contract 2, confirmed it into BILL-1791631305468, and submitted a 0.001 USDC Arc Testnet payment. Business record 6dc25245-477f-4403-aed6-16b2d74af301 reconciled to paid with transaction hash 0x7963cabd05b42a53afd9477c4bd9f0048b0ddf53be6a00c8da2a0484c21b0cef. The paid bill and its saved group appeared in the bill list. The first approval required an explicit reconciliation; the adapter was then corrected to perform that refresh automatically. This correction has not been verified with a second transfer.

Profile name editing now awaits a persistent save rather than a placeholder handler. A temporary QA suffix survived browser reload and was subsequently removed. Uploading the Settlbox PNG succeeded and the saved /api/uploads/ image survived reload; the image remains as the profile picture. Evidence: browser-evidence/profile-upload-verified.jpg. Browser error capture on the revisited invoice, payroll, bill and account screens did not reproduce the update-depth error; this does not establish that every route is free of it.

Evidence: browser-evidence/invoice-draft-fixed.jpg and browser-evidence/qa-payroll-settled.jpg. TypeScript checking passed and all 65 automated tests passed after these changes. Final production build status is recorded separately below.

Remaining: presentation/services/api/team-member.ts still contains placeholder mutations and must be connected to the actual membership API without confusing historical display records with security principals. Notification read-state and delivery still need browser verification. Outbox delivery requires a configured delivery provider. Fiat payouts, cards and yield remain deferred. The complete application is not yet verified end to end.
