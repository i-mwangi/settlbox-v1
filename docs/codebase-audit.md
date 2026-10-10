# Settlbox verification audit

Static module analysis checked 841 source files from 132 framework, script and test entry points. 744 files are reachable; 97 files are candidates for manual usage review, not proven safe deletions. See file-usage-audit.json. Runtime string imports, assets and framework conventions limit static analysis.

Production dependencies resolve successfully with npm ls --omit=dev --depth=0. Although immer and react-is have no direct source imports, npm ls confirms recharts uses both and zustand uses immer. Both packages are retained.

Read-only scans covered all local SQLite tables. Two seeded display records were corrected with a transaction and workspace revisions incremented. A subsequent scan found no targeted old brand or provider references. Amounts, transaction hashes and settlement records were preserved.

Development bundles contain stale application text from earlier compilations. They need a stopped-server cache refresh; editing generated chunks is not a source fix. Production output is rebuilt separately. Third-party code and license notices retain their own identities.

Reachability and build success do not establish complete workflows. Team mutation adapters and note-oriented actions remain incomplete. Fiat payouts, cards, yield and outbound email require configured providers. Signed-in browser verification remains outstanding.

The unused-component review removed 84 unreachable duplicate files after checking that their presentation counterparts exist and no retained source module imports them. A recovery copy is stored outside the project; unused-component-removal.json records the files and location. Ambient declarations and modules requiring additional review are retained.

The reimbursement screen still uses hardcoded example records, filename-based simulated extraction and React-local submission state. It is not a completed persistent reimbursement or Arc settlement workflow.
