# Arc route and dependency audit

## Implemented corrections

- Both layouts now use the real Arc network store. The restored presentation layout no longer supplies a fake connected wallet or `demo-address`.
- The Arc wallet picker requests the injected EVM wallet and checks Arc Testnet. Wallet creation, backup and import remain the responsibility of the wallet application; the old adapters no longer return invented accounts.
- Contact forms in both component trees validate EVM addresses and use chain ID `5042002`.
- Address formatting is chain-independent. Identicons preserve real EVM addresses and derive distinct display seeds for other labels instead of returning one hardcoded address.
- Restored token views support USDC only. Native USDC uses 18 decimals; its ERC-20 interface uses 6. Transaction-view amounts now use native units.
- Explorer imports and wallet components have Arc names. Removed the obsolete announcement/reset modal, unused SDK hooks, unused serialized-signature helper and unused note script.
- Card checkout no longer reports a successful payment without a provider.
- The wallet reset screen signs out without clearing all browser storage or deleting wallet databases.

## Route inventory

| Routes | Current implementation | Remaining verification or work |
| --- | --- | --- |
| `/`, `/reports`, `/transactions`, `/transactions/detail` | Preserved business views over seeded records; Arc metadata and network context | Signed-in visual walkthrough; historical imported figures remain historical data |
| `/contact-book`, `/client`, `/setting` | Validated persisted master data; EVM address forms | Team/social-provider adapters still require separate integration |
| `/payroll`, `/payroll/create`, `/payroll/detail`, `/invoice`, `/bill` | Persisted contracts, invoices and bills; authenticated Arc treasury payment lifecycle | Newly created UI journey still requires signed-in walkthrough |
| `/payment-link`, `/payment/[code]`, `/invoice-review/b2b` | Existing saved payment/public settlement endpoints; real external Arc wallet context | External payer must connect a wallet; public invoice lookup and full checkout journey need further verification |
| `/operator`, `/testnet-treasury`, `/transfer` | Original live layout; Circle treasury and external Arc wallet adapters | Keep workspace authentication distinct from wallet connection |
| `/gift`, `/gift/open-gift` | Existing Arc escrow infrastructure | Contract deployment/configuration and browser claim journey need independent verification |
| `/dashboard/pending-receive`, `/dashboard/cancel-payment`, `/dashboard/schedule-payment`, transaction editing | Preserved note-oriented screen structures | Note consumption, recall and note rewriting are unsupported on Arc; they are not ordinary EVM transfers and have not been implemented by changing names |
| `/team-invite`, `/invoice-review` | Removed fake embedded-wallet authentication; identity prompts lead to real email/password login | Invitation acceptance and employee review adapters still require complete integration |
| `/card`, `/ramp`, `/earn`, `/global-account` | Preserved interfaces | Provider-dependent; not verified financial services |
| `/legacy/*`, `/dev/deploy-faucet` | Retained development and legacy routes | Not claimed as supported Arc workflows |

## Explicit unsupported boundary

`presentation/services/unsupported` contains inherited note/account operations that fail explicitly. Moving these out of a chain-named utility directory does not implement them. The existing Arc payment, payment schedule and gift escrow APIs are the appropriate backends for replacing these workflows.

Browser storage uses Settlbox names. Batch drafts are copied from a uniquely matching previous storage key when the current key is absent; the previous data is retained. Storage compatibility does not activate an old chain or wallet provider.

No new on-chain payment was submitted during this audit. Existing confirmed settlement evidence remains in `reuse-implementation-progress.md`.

## Validation

60 tests passed, including distinct native/ERC-20 amount precision, stable address-preserving identicons, and batch-draft storage compatibility without deletion. The final full TypeScript check and production build passed. Browser navigation to `/contact-book` correctly reached the real login page, with the preserved Settlbox branding and email/password form. Signed-in visual and wallet interaction checks remain outstanding. This audit does not establish that every preserved screen works end to end.

The final dependency cleanup removed the mock signer hooks and unused external-identity authentication methods. Transaction identity reads the connected Arc wallet address directly. Retired restore scripts were removed to prevent restoring obsolete dependencies. Source, imports, maintained scripts and documentation, and package manifests were checked for retired provider identifiers with no remaining matches. Generated caches, logs, third-party dependencies and embedded image bytes are outside that source scan.
