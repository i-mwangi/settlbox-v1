# Circle execution wallet

The company owner and approver are controlled through Circle PIN authentication. Automated contract calls require a separate developer-controlled Circle wallet. `scripts/prepare-agent-executor.mjs` creates that wallet using a stable company-scoped idempotency key, verifies its Arc Testnet custody and saves public identifiers in the ignored executor registry. Re-running reuses and verifies the saved wallet.

`SETTLBOX_AGENT_EXECUTOR_CONFIG` selects the registry in `.env.local` and `.env.example`. No private key is created in the application. The existing Circle API key and registered entity secret authorize provider operations on the server.

On Finance agent, **Assign Circle executor** prepares only `setExecutor(address)` for the verified registry address. The vault must be paused and the connected Circle wallet must match the administrator. The human signs through Circle. **Verify Circle executor** checks chain ID, runtime, owner, paused state and Circle custody before updating the vault registry. Submission or SDK success alone cannot change the configured identity.

Verified on October 11, 2026: the human wallet is owner and approver; the previous executor is an allowed recipient; the vault holds zero native USDC and remains paused. Dedicated Circle execution wallet: `0xd9327984fbf3887c3fca069a56213299d252531b`. Assignment requires the owner's PIN approval. No payment has been queued or executed by this setup. Agent planning remains proposal-only until the durable payment workflow is connected and tested.
