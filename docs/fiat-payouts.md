# Fiat payout integration

Kora sandbox account assignment, destination discovery, saved recipients and reviewed payouts are available in Settings → Fiat payouts and Cashout. These use simulated provider funds and never move Arc USDC.

Each business uses its own provider account. Server credentials are referenced by environment variable name and never returned to the browser. The same credential cannot be assigned to two businesses. Rotated credentials must be saved again. Live keys are rejected.

Supported discovery routes:

| Market | Currency | Destination |
| --- | --- | --- |
| Kenya | KES | Bank account, mobile money |
| Nigeria | NGN | Bank account |
| Ghana | GHS | Mobile money |

Operator slugs and bank codes come from Kora, rather than a hardcoded M-Pesa mapping. A recipient's phone/account number must subsequently be saved and verified against the selected operator or bank. Discovery does not establish recipient identity, merchant eligibility, available balance or pricing.

## Server setup

Create a Kora test account and privately set `SETTLBOX_KORA_COMPANY_TEST_KEY` in `.env.local`. Restart the server after changing environment variables. Enter only that variable name in Settings. Other businesses need separate account credentials and separate variable names matching `SETTLBOX_KORA_*_KEY`.

Set the matching `pk_test_` public key as `SETTLBOX_KORA_COMPANY_TEST_PUBLIC_KEY`. Kora's API reference requires public-key authentication for Miscellaneous destination lists; secret-key authentication is used for balance and payout APIs. A destination-list authentication failure alone does not establish that the secret key is invalid.

## Recipient and payout workflow

Save the recipient's exact name, email, country, bank/operator and account number. Bank and operator codes are fetched from Kora. Account details are immutable; a changed account requires a new recipient. Resolve Nigerian/Kenyan bank accounts and Ghanaian mobile wallets before preparing a payout. Kenyan mobile-money name resolution is unavailable and explicitly shown as unverified at review.

Preparation persists an immutable account snapshot and exact local currency amount. Review expires after 15 minutes. Authorization atomically claims the saved payout once; only the owner who prepared it can submit. Timeouts, unknown responses and restarts cannot trigger a resend. Status checks query the same provider reference and require matching amount/currency/reference. Sandbox results use `sandbox_success`, never `paid`, and do not modify invoices, contractors or reimbursements. The audit trail records preparation, human authorization and reconciliation.

Finance chat can find destination codes, save/verify recipients, prepare payouts, authorize an exact saved payout, cancel drafts and query status. Every operation uses the same server services and review pop-up. Fiat amounts are KES/NGN/GHS, separate from USDC. Preparation never submits funds. The Cashout screen no longer presents hardcoded FX rates, fees or a fictional linked bank account.

## Remaining provider work

- A signed webhook endpoint is implemented at `/api/payout-provider/webhook`. It checks Kora's HMAC over the event data and re-queries the provider before changing any payout state. Delivery requires a publicly reachable deployment and registering that URL in Kora. Localhost reconciliation can run automatically through the status worker below; manual checks remain available.
- Provider confirmation of UAE/US merchant eligibility, supported payout corridors and stablecoin-to-fiat funding.
- Production funding via a supported network, potentially CCTP from Arc. Arc Testnet assets cannot fund real fiat payouts.
- Reviewable fee/FX quotes before live authorization; no invented conversion rates.

Sandbox provider results must never mark a real invoice, contractor payment or reimbursement as paid. Mainnet and live payout execution remain disabled until the required funding and authorization path is verified.

## Verification (2026-10-13)

- Real Kora test credentials accepted; destination discovery returned Kenya's three mobile operators and 44 banks, Nigeria's 253 banks, and Ghana's three mobile operators.
- Published sandbox fixtures resolved for Nigerian and Kenyan banks and Ghanaian mobile money. Kenyan mobile money remains explicitly marked unsupported for account-name resolution.
- Kora accepted simulated Kenya, Ghana and Nigeria payout submissions. Subsequent status queries matched the same reference, local amount and currency and reached `sandbox_success` for all three. Provider-reported fees were 0 KES, 0 GHS and 32.25 NGN. These are test settlements, not real-money delivery.
- Kora rejected a 500 NGN test amount as below its current 1,000 NGN minimum. The minimum is now checked locally before preparation. Earlier unresolved/rejected test references were never resent.
- Local tests cover amount precision, cross-company isolation, immutable recipients, expiry, duplicate submission, stale writes, restart recovery, webhook signatures and account-data minimization in chat results.
- `scripts/verify-fiat-payouts.mjs` verifies production HTTP and chat-dispatch boundaries against an isolated fake provider, without real credentials or funds.

References: [Kora payout API](https://developers.korapay.com/docs/payout-via-api), [Kora test/live modes](https://developers.korapay.com/docs/test-live-modes), [technical support FAQ](https://support.korapay.com/hc/en-us/articles/31129494583186-Kora-Technical-Support-Developer-FAQ).

## Automatic status reconciliation

Configure a private random `SETTLBOX_PAYOUT_STATUS_TOKEN` of at least 32 characters. The production startup script runs a status-only worker, and the Docker image includes it. It checks up to three due saved references per minute. This credential cannot save recipients, configure provider accounts, prepare drafts or submit payments. The worker endpoint ignores execution payloads and only reconciles existing requests.

Database leases prevent overlapping checks of the same payout and expire after a process crash. Recent in-flight submissions receive a two-minute grace period before crash recovery. Provider failures back off from one minute to at most one hour; retries query the original reference and never resend it. Terminal payouts are removed from the polling queue. Drafts awaiting human review are excluded.

Cashout and Settings refresh their saved payout lists every minute, including the status of an already submitted payout in its review dialog. Pending review details remain unchanged. Missing worker configuration leaves manual status checks available. Running multiple worker processes is safe because claims and completion are bound to durable lease tokens.
