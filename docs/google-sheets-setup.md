# Google Sheets setup

1. Open https://console.cloud.google.com/ and create or select a project.
2. Enable the Google Sheets API under APIs & Services → Library.
3. Configure Google Auth Platform branding, audience and data access. For development, add your Google account as a test user.
4. Create an OAuth client of type Web application. Add this exact authorized redirect URI:
   `http://127.0.0.1:3002/api/integrations/google-sheets/callback`
5. Privately place the client ID and client secret in `.env.local` as `SETTLBOX_GOOGLE_CLIENT_ID` and `SETTLBOX_GOOGLE_CLIENT_SECRET`. Never paste the secret in chat or commit it. Set `SETTLBOX_GOOGLE_REDIRECT_URI` to the URI above. `SETTLBOX_INTEGRATION_ENCRYPTION_KEY` must be 32 random bytes encoded as 64 hex characters; keep it stable and private or saved connections cannot be decrypted.
6. Restart the server, open Settings → Google Sheets from the same localhost origin, and click Connect Google Sheets. Complete Google's consent yourself. The integration requests spreadsheet read/write access; the scope applies to spreadsheets accessible to your Google account, not just the tab selected in Settlbox.

For a public deployment, use a stable HTTPS origin and register its exact callback instead. Use the same origin to start and complete the connection. Google's app verification requirements and test-user restrictions still apply.

## Import template

Row 1 must contain these eight columns, in this order:

`sourceId, kind, title, counterparty, recipient, amount, dueDate, description`

Each sourceId must be unique and stable within the spreadsheet and tab. Supported kinds are invoice, bill and payroll. Amounts are USDC strings and dates are YYYY-MM-DD. Invoice recipients must be the configured company treasury address. Up to 100 rows are previewed. Review every field before importing; all imported records are drafts. Import never issues an invoice, approves a bill or sends funds. Repeating the same sourceId and values does not duplicate records; changed values for an existing sourceId are rejected for manual review.

Exports create a new spreadsheet with up to 1000 saved records, including their statuses and recorded transaction hashes. Values use RAW input to prevent text starting with '=' becoming spreadsheet formulas. Google records do not create spendable balances. Disconnect requests Google token revocation before removing the saved connection.

This first implementation uses explicit Preview/Import and Export actions. Scheduled or bidirectional automatic synchronization is not enabled.

References: https://developers.google.com/identity/protocols/oauth2/web-server and https://developers.google.com/workspace/sheets/api/scopes

For the test CSV, use File → Import in Google Sheets and turn off conversion of text to numbers, dates and formulas, or format columns A:H as Plain text before entering the test rows. This preserves YYYY-MM-DD dates and decimal amounts exactly. Use `docs/google-sheets-import-template.csv` for one draft-only test row.
