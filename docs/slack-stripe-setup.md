# Slack and Stripe setup

## Slack

Create a Slack app for your workspace, enable Incoming Webhooks, and add a webhook for the exact channel that should receive notifications. Privately store the URL in `.env.local` as `SETTLBOX_SLACK_COMPANY_WEBHOOK_URL`. Never paste the webhook URL in chat or put it in a browser form.

Restart Settlbox, open Settings → Slack, enter only the variable name and click Configure Slack. No message is sent by configuration. Click Send connection test yourself to post a harmless confirmation to the selected channel. Enable automatic notifications only if you want new/changed record titles, amounts, statuses and settlement hashes posted there. The configured finance background worker checks once per minute. Existing history is skipped when enabling notifications. Uncertain deliveries are recorded and never retried automatically; inspect Slack before another attempt. Disconnect stops future access from Settlbox; revoke the webhook in Slack to invalidate the credential itself.

The integration does not read channel messages or allow Slack users to approve payments.

## Stripe

In the Stripe Dashboard, create a restricted test API key. Grant Read access only to Account, Customers, Invoices and Charges. Privately store it as `SETTLBOX_STRIPE_COMPANY_READ_KEY` in `.env.local`. Full-access `sk_` secret keys are rejected. The implementation issues only GET requests to Stripe, including with a restricted live key if later configured.

Restart Settlbox, open Settings → Stripe, enter only the environment variable name and click Connect Stripe. It retrieves the account identity and latest 100 customers, invoices and charges per category. Refresh Stripe records takes a new explicit snapshot. The UI indicates when additional records exist; full-history pagination and automatic Stripe synchronization are not implemented. Amounts retain their source currency and are displayed using the currency's minor-unit scale. Stripe snapshots are isolated from canonical Arc invoices and spendable treasury balances; a paid Stripe invoice cannot mark an unrelated Arc bill paid.

Disconnect removes the saved connection and snapshot from Settlbox. Revoke or rotate the restricted key in Stripe itself when needed. This is a record-reading integration, not Stripe Connect onboarding, card charging or payouts.

References:
- https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/
- https://docs.stripe.com/keys

Slack recovery: record notifications are paced at least 1.1 seconds apart within a cycle. Confirmed HTTP 429 rejections respect Retry-After, pause the channel and receive at most three persisted attempts. Network failures, unexpected acknowledgements and server errors remain uncertain and are not automatically resent; check Slack before another attempt. Other confirmed client rejections are marked failed. Delivery audit shows the sanitized reason and attempt count. Old uncertain records are preserved rather than falsely marked delivered.

Arc reads use bounded retry and a documented backup RPC. SETTLBOX_ARC_BACKUP_RPC_URL can select another HTTPS Arc Testnet read endpoint. No transaction-submission method is permitted on this read transport. Notification processing runs independently of finance RPC reads.

References: https://docs.arc.io/arc/references/rpc-endpoints and https://docs.slack.dev/apis/web-api/rate-limits/
