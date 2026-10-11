# Embedded human wallet approvals

The finance agent uses developer-controlled execution services. Human wallet onboarding and vault administration use Circle's user-controlled PIN challenges. The human flow never uses the entity secret, receives a PIN, or receives recovery answers. Circle's secure Web SDK screen handles those values.

## Configuration

- `NEXT_PUBLIC_CIRCLE_APP_ID`: Circle Console → Wallets → User Controlled → Configurator. Configure the application's allowed web origins for the deployed environment.
- `CIRCLE_USER_CONTROLLED_API_KEY`: optional dedicated Circle API key for the same user-controlled app. Defaults to the existing `CIRCLE_API_KEY`. API keys remain server-only.
- `SETTLBOX_HUMAN_WALLET_DATABASE`: durable journal of public administration requests and challenge identifiers; defaults to `.data/human-wallet-approvals.sqlite`.

The current workspace owner can connect or create a Circle Arc Testnet EOA through the Finance agent page. PIN and recovery enrollment requires the human to complete Circle's screen. Session tokens are held in browser memory and a short-lived server map bound to the existing authenticated workspace session. They are not written to localStorage, logs or the approval journal. Restarting the server requires reconnecting. Existing workspace role checks still apply.

## Vault ownership

A new Circle wallet has its own address. It cannot automatically control the already deployed vault. The currently configured administrator must call `proposeOwner(newAddress)` and the nominated Circle wallet must call `acceptOwnership()`. The vault must remain paused during this setup. Neither operation is performed by creating a wallet. Ownership transfer tooling and configuration reconciliation must be completed before treating a newly onboarded wallet as the active administrator.

For a user-controlled wallet that already matches the verified vault administrator, the UI can prepare four constrained challenges: allow an approver, allow a recipient, pause, and unpause. Every challenge requires human authorization through Circle. No arbitrary contract, calldata, value transfer, recovery, policy change or executor change is accepted by this endpoint. Activation requires sufficient configured approver capacity. The executor cannot be added as a human approver.

Each administration request has a company/principal-scoped provider idempotency key. Its canonical payload and challenge ID are journaled. Reusing a request ID with another payload is rejected. A challenge ID or SDK callback is not proof of settlement: verify the contract's current state and transaction receipt before reporting an administration operation as confirmed.

## Remaining live verification

Complete human PIN enrollment, confirm that the resulting wallet belongs to the intended person, explicitly transfer or establish vault ownership, reconcile the administrator configuration, and verify one signed administration transaction and its receipt. Funding, autonomous agent execution and payment settlement are separate operations and remain disabled by this onboarding increment.

Official references: [Circle user-controlled wallet app](https://developers.circle.com/wallets/user-controlled/build-a-wallet-app), [supported blockchains](https://developers.circle.com/wallets/supported-blockchains), [contract execution challenges](https://developers.circle.com/api-reference/wallets/user-controlled-wallets/create-user-transaction-contract-execution-challenge).
# Ownership transfer

The approval-wallet card includes **Nominate with Rabby**, **Accept with Circle**, and **Check ownership**. Nomination requires Rabby in the current browser, the currently recorded on-chain owner, and Arc Testnet. The transaction sends no value and only calls `proposeOwner` with the connected Circle address.

Acceptance is available only after the chain reports that same Circle wallet as pending owner. Its challenge is scoped to the authenticated owner session and saved with a bound idempotency key. The user signs in Circle. Challenge completion is not treated as transaction confirmation.

Check ownership verifies the network, deployed runtime, executor, paused state and actual owner before updating the company vault registry. It never changes the administrator based on a submitted transaction or SDK callback. No transfer has been signed automatically. The deployment environment administrator remains the original deployment input; runtime administration uses the verified vault registry.

If a development restart expires the provider session, use **Reconnect approval wallet**. PINs and recovery answers stay in Circle.
