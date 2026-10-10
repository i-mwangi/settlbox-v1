# Settlbox architecture review

Settlbox provides company workspaces, contacts, payroll, invoices, bills, payment links, approvals and Arc Testnet USDC settlement.

The application preserves its business interface while connecting supported operations to validated server records. Provider-dependent cashout, cards and yield require separate configuration. Unsupported actions must fail explicitly rather than report payment success.

See arc-route-audit.md for workflow support and reuse-implementation-progress.md for implementation status.
