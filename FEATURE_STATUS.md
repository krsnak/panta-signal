# Panta Signal — Feature-by-feature delivery

## Delivery rule

From 2026-10-02 onward, Panta Signal is developed **one user-facing function at a time**.

We do not start the next function until the current one:

1. has a clear user problem,
2. has explicit acceptance criteria,
3. works against real Panta data,
4. has failure / empty / stale-data states,
5. passes automated tests, lint, and production build,
6. is verified in production,
7. is visually understandable without explanation,
8. has its final state recorded in this file.

Global refactors, unrelated polish, new features, submission work, and extra integrations are paused unless they are required to finish the active function.

---

## Function 1 — Signal Feed

### User problem

Opening the raw Panta market catalog does not immediately answer:

> What changed, how meaningful is the change, and is there real trading activity behind it?

Panta Signal Function 1 must answer that question on the first screen.

### Product definition

Signal Feed combines three authoritative sources:

- current Panta market detail,
- Panta public trade tape,
- Panta Signal durable historical snapshots.

It can produce two truthful signal types:

#### A. Price movement

Example:

```text
YES 42.0% -> 57.0%
+15.0 pts / 6h
last observed 2m ago
```

This signal is shown only when stored observations prove the movement.

#### B. Trading activity

Example:

```text
2 trades / 24h
21.61 YES shares
$11 current market volume
last trade 18m ago
```

This signal can be useful even when probability has not moved.

### Truthfulness rules

- Never invent historical movement.
- Never label an untouched 50/50 starting price as crowd consensus.
- Catalog metadata is discovery-only when it conflicts with market detail.
- Market detail is authoritative for current phase / price / volume when available.
- Trade amounts must be normalized from Panta's 1e6 base units.
- Cached data must be visibly labeled.
- If there is not enough history for a mover, say so instead of promoting an arbitrary market.

### Acceptance criteria

- [x] First screen clearly says what Signal Feed does.
- [x] At least one real observed market renders as a complete signal card.
- [x] Signal card shows current YES / NO.
- [x] Signal card shows observed probability change and timeframe, or explicit `0.0 pts` / insufficient-history state.
- [x] Signal card shows 24h trade count.
- [x] Signal card shows normalized YES / NO traded shares.
- [x] Signal card shows current market volume.
- [x] Signal card shows last trade / observation freshness.
- [x] Signal card distinguishes live / cached / unavailable data.
- [x] Clicking the signal opens a detail view that explains the same data consistently.
- [x] Empty state remains understandable when Panta has no additional active signals.
- [x] No catalog-only phase/volume is presented as authoritative live state.
- [x] Unit / integration tests cover movement and activity calculations.
- [x] Production smoke test passes.
- [x] Desktop browser layout / hydrated-content review passes.

### Current status

**DONE — 2026-10-02**

Working foundations:

- durable Postgres snapshots,
- current live/cached quote states,
- real Panta trade tape,
- trade base-unit normalization,
- real 24h activity summary,
- persistent Top Movers calculation,
- production health endpoint,
- catalog/detail inconsistency identified and isolated,
- current market detail hydration independent of server page TTFB.

Final verified production state:

- primary Signal Feed is the dominant first-screen product surface,
- canonical signal model combines current quote, durable movement, 24h trades/shares, volume and freshness,
- homepage and detail use the same signal facts and explanation,
- stale / unavailable / collecting / flat states are explicit,
- additional signals use deterministic ranking and truthful empty/partial-failure states,
- Manchester production signal verified as `activity / live / fresh`,
- production values verified at audit time: YES 51.8%, NO 48.2%, +0.0 pts, 15 observations, 2 trades, 21.61 YES shares, $11 volume,
- last-trade freshness verified in the live UI,
- production health endpoint reports `ok`,
- final local gate: 35/35 tests PASS, lint PASS, production build PASS,
- warm production measurements: homepage ~1.0–1.2s total; cached canonical Signal API ~0.10–0.23s,
- desktop review used the live browser viewport/layout metrics plus hydrated DOM content; screenshot transport was unavailable, so no pixel screenshot is claimed as evidence.

### Short-task log

| Task | State | Result |
| --- | --- | --- |
| F1.1 Freeze scope + acceptance criteria | DONE | This document defines Function 1 and prevents unrelated work. |
| F1.2 Build one canonical signal data model | DONE | One tested model now combines current quote, durable price movement, 24h trade activity, freshness, and truthful signal kind. |
| F1.3 Expose canonical Signal API | DONE | One production endpoint now composes current detail, durable history, 24h trade activity, freshness, and explicit unavailable states into one signal object. |
| F1.4 Build primary Signal Feed card | DONE | The first product surface now explains the market signal with live probability, observed movement, 24h trades/shares, volume, freshness, and truthful fallback states. |
| F1.5 Build Signal list / ranking | DONE | Canonical active-signal feed ranks movement before activity, excludes resolved markets, avoids duplicating the primary card, and shows an explicit truthful empty state. |
| F1.6 Mirror signal in market detail | DONE | Homepage and market detail now use the same canonical signal model, movement/activity numbers, quote state, history window, and shared explanation; production Manchester smoke matches exactly. |
| F1.7 Failure / stale / flat-history states | DONE | Signal Feed now distinguishes fresh/stale/unknown observations, unavailable trade activity, flat vs collecting history, and partial feed refresh failures without fabricating zero activity. |
| F1.8 Production + visual audit | DONE | 35/35 tests, lint/build, production health and endpoint smoke, hydrated first-screen review, desktop layout metrics, freshness and performance checks passed. |

---

## Function 2 — Wallet Intelligence

**PAUSED — Function 1 is complete, but Function 2 has not been started under the new delivery workflow.**

Existing work may remain in the codebase, but no additional Function 2 development starts until it is explicitly selected as the next active function.

---

## Function 1 v2 — Historical Price Reconstruction

**NEXT INVESTIGATION — not yet implemented**

### Why this exists

Function 1 v1 is production-complete, but its two data dimensions have different historical depth:

- **trade activity history** is already available from Panta's public trade tape for the previous 24 hours,
- **probability / price history** is currently produced from Panta Signal's own durable Postgres snapshots collected from live market detail.

This means a newly observed market can immediately show real recent trades, traded YES/NO shares and last-trade time, while a true 6h / 24h probability movement requires enough Panta Signal snapshots to have accumulated.

The next work is therefore **not** to redesign Signal Feed again. It is to investigate whether historical probability can be reconstructed retrospectively from data that already exists.

### Research question

Can Panta Signal reconstruct an exact or sufficiently reliable historical YES/NO probability series from:

1. Panta public trade-tape rows,
2. the Solana transaction signatures contained in those rows,
3. the corresponding on-chain transaction instructions / logs / account changes,
4. Panta program / market state visible on Solana,
5. or another documented Panta endpoint that exposes historical state?

### Important current fact

The public Panta trade tape gives useful historical activity fields such as:

- transaction signature,
- block time,
- wallet,
- primary / secondary flag,
- YES amount,
- NO amount,
- fee.

The YES/NO amounts are 1e6 base units and are already normalized by Panta Signal.

However, the trade-tape response **does not currently expose an explicit historical post-trade YES/NO spot probability field**. Therefore trade amounts alone must not be treated as historical price.

### v2 research plan

Perform the following in short, documented tasks:

| Task | State | Goal |
| --- | --- | --- |
| F1v2.1 Verify all official historical-data surfaces | DONE | Current official playground/API surface exposes current market prices and historical trade activity, but no documented historical spot-price/state series or trade-row price field. |
| F1v2.2 Inspect real trade transactions on Solana | DONE | Real mainnet event history inspected. Panta exposes exact price-bearing secondary order events on-chain, but primary trades lack an explicit historical price and the web chart uses a heuristic fallback. |
| F1v2.3 Test historical price reconstruction | PAUSED / BACKLOG | Resume only after submission-critical work is complete or if exact reconstruction becomes a direct demo blocker. |
| F1v2.4 Validate against known observations | PAUSED / BACKLOG | Deferred with F1v2.3. |
| F1v2.5 Decide source hierarchy | PAUSED / BACKLOG | Current production hierarchy remains unchanged for the hackathon release. |
| F1v2.6 Implement only if superior | PAUSED / BACKLOG | No reconstruction integration before the submission sprint. |
| F1v2.7 Production verification | PAUSED / BACKLOG | Not applicable until v2 implementation resumes. |

### Decision gate

Do **not** implement reconstructed historical prices merely because a plausible formula can be invented.

### F1v2.1 findings — 2026-10-02

Official surface re-check completed against the current Panta API documentation surface available to the project and the official `Kaito-HQ/panta-api-playground` repository (main commit `a92b0db`, 2026-09-09).

What Panta officially exposes that is relevant:

- `GET /markets/` and `GET /markets/{id}/` expose current catalog/detail state, including current price fields such as `yesPrice`, `noPrice`, `primaryYesPrice`, `primaryNoPrice`, `secondaryYesPrice`, and `secondaryNoPrice`.
- `GET /markets/{id}/trades/` and `GET /wallets/{wallet}/trades/` expose historical trade rows with `signature`, `blockTime`, `wallet`, `isPrimary`, `yesAmount`, `noAmount`, `feePaid`, and related attribution fields.
- `POST /primaryorderquote/` returns a current executable quote with `shares`, `avgPrice`, and `feeUsdc`; this is a pre-trade quote, not a historical trade-tape price record.
- `POST /primaryorderbuild/` returns concrete Solana instructions with each instruction's `programId`, account metas, and encoded instruction data. This confirms that the public API gives enough identifiers to trace the execution path on-chain.
- `POST /trades/` plus `GET /trades/{signature}/` provide trade reporting/status by Solana transaction signature.

What is still missing from the official surface:

- no documented historical market-price/probability time-series endpoint,
- no explicit historical YES/NO spot price or post-trade probability on catalog trade rows,
- no documented AMM reserve history endpoint,
- no documented market/program account layout suitable for directly decoding historical state,
- no published pricing formula that can safely turn `yesAmount` / `noAmount` into spot probability,
- no transaction decoder or public Panta program ID/account schema in the playground that would make reconstruction immediate.

Research conclusion:

- We still must **not** derive implied historical prices from `yesAmount` / `noAmount` alone.
- A realistic reconstruction path nevertheless exists through Solana history because every public trade row carries a transaction signature and Panta's own build flow exposes the underlying Solana instruction/program/account structure.
- F1v2.2 will therefore take several real public trade signatures from the live tape and inspect the corresponding mainnet transactions read-only: outer/inner program IDs, instruction data, logs, writable accounts, token balance changes, and any pre/post market-account state available from RPC. The goal is to identify whether an exact market state or deterministic price-bearing state is recoverable at each trade boundary.
- No production Signal Feed code changes are justified yet. The current source hierarchy remains durable snapshots for historical probability movement plus Panta trade tape for immediate historical activity.

### F1v2.2 progress — 2026-10-02

First read-only transaction-source pass:

- The local `.env.local` Panta configuration resolves to the sandbox/test catalog. Its visible market is `TestMarket1111111111111111111111111111111` and it has no usable real trade rows, so it must not be used as evidence for mainnet reconstruction.
- The connected Vercel integration could identify the production deployment but is not authorized to read that project's protected deployment aliases/data, so it cannot currently be used to pull the production Signal API.
- The public `panta.market` dashboard bundle is directly readable and contains a YES/NO **price history chart** with timestamped points. This is important because the official playground did not document any historical price series. The frontend therefore appears to consume an additional history-capable surface that still needs to be identified precisely.
- The history chart does **not** use a hidden historical HTTP endpoint. Its production bundle loads Solana signatures for the market/event PDA via `getSignaturesForAddress`, fetches each transaction with `getParsedTransaction`, parses Panta instructions / `Program data:` logs, and builds the chart client-side.
- The production bundle ships the current Panta Anchor IDL. The current program address embedded in that IDL is `6gM5afTQBq5VZCfgpGqcsqzfWd5maLSCKWtGjbEobZMp` (`balr_market`, Anchor).
- The on-chain parser contains explicit binary discriminators for Panta trade/order events and can recover `side`, acquisition type, wallet, amount, and — for several secondary-market events/instructions — an explicit price encoded as an integer scaled by `1e9`.
- For price-bearing secondary events the parser reads the encoded price, converts it with `price / 1e9`, and deterministically maps it to YES probability (`YES => price`, `NO => 1 - price`). This is a real protocol-derived order price point, not an inference from `yesAmount` / `noAmount`. It must not be labelled an executed fill unless the transaction semantics prove execution.
- For primary orders, the inspected primary event/instruction paths expose side and money spent but do not consistently expose an explicit price. When a parsed trade has no `yesPrice`, the Panta chart's fallback function adjusts the previous price heuristically based on side and trade size. That fallback is visualization logic and **does not satisfy** our F1v2 decision gate.
- Therefore the likely usable source split is now: **secondary history = potentially exact from on-chain encoded trade price; primary history = still unproven and must not use the chart's heuristic fallback.**
- Panta's current public How It Works documentation clarifies protocol semantics: primary-market YES and NO prices sum to 1 and move with demand; secondary trading is a CLOB where YES/NO prices are independent. Any reconstruction method must therefore be phase-aware and cannot assume one universal AMM formula.

F1v2.2 real-mainnet verification:

- Inspected event account `69A5oC4BXuHC1hG6EVpLZbgSH4GQGVBMgQKwHz3YhbZk` through public Solana mainnet RPC.
- 42 recent event-account transactions were classified. The history contains real `PrimaryOrder`, `SecondaryLimitOrder`, and `CancelSecondaryOrder` instructions.
- Seven price-bearing secondary events were decoded from real transactions. Examples include raw prices `500000000`, `432556860`, `567443140`, `567400000`, and `700000000`, corresponding to normalized side prices 0.500000000, 0.432556860, 0.567443140, 0.567400000, and 0.700000000.
- Side normalization is deterministic: a YES order at 0.567443140 maps to YES 56.744314% / NO 43.255686%; a NO order at 0.432556860 maps to the same YES 56.744314% / NO 43.255686%.
- These verified price-bearing records were `SecondaryLimitOrder` transactions. They prove that exact historical **order prices** are available on-chain, but they do not by themselves prove an executed secondary fill at each point.
- The same event-account history contains numerous real `PrimaryOrder` transactions. The inspected primary parser path still does not expose an explicit historical post-trade YES probability. Standard transaction RPC provides transaction metadata/balances but not a historical post-transaction snapshot of arbitrary account data that would trivially recover `lastYesPrice`.
- The current Panta event account schema itself contains `lastYesPrice`, `lastSecondaryYesPrice`, and `lastSecondaryNoPrice`, confirming that canonical current price state exists on-chain. The missing piece is exact historical account state at every primary trade boundary.
- Panta's own chart fills this primary-history gap with a heuristic price adjustment. That heuristic is explicitly rejected for Panta Signal reconstruction.

F1v2.2 conclusion:

- **Exact secondary order-price history: proven.**
- **Exact executed-fill price coverage: not yet proven across the sampled market.**
- **Exact primary historical probability: not proven.**
- Therefore F1v2.2 does not justify changing the production Signal Feed. F1v2.3 may experiment with the protocol-derived subset only; it must measure coverage and must not silently substitute order prices or heuristic primary prices for actual historical market probability.

No production code changes have been made.

### Priority decision — 2026-10-02

Function 1 v2 is deliberately stopped after F1v2.2. The research is documented and preserved, but continuing it now has a poor submission-value / engineering-cost ratio because exact primary historical probability remains unproven.

Active project priority is now:

1. **SolanaCZE submission readiness**
2. **Colosseum submission readiness**
3. **Panta API Sidetrack submission from the same release candidate**
4. Historical reconstruction only after submission-critical blockers are cleared

The next active work is not Function 2 and not F1v2.3. It is a short **submission sprint** focused on judge comprehension, visible Solana proof, production reliability and demo packaging. See `ROADMAP.md`.

### Submission Sprint S1 — Judge-first product pass

| Task | State | Goal |
| --- | --- | --- |
| S1 audit | DONE | Production homepage + market detail reviewed from a first-time judge perspective. |
| S1.1 First-screen story | DONE | First screen now states the product purpose, Solana positioning and trusted data sources before the Signal hero. Local render, tests, lint and production build verified. |
| S1.2 Simplify Signal hero | DONE | Hero now prioritizes probability movement, trading activity and market volume, adds a plain-language takeaway, and demotes observations/share/quote state into trust labels. Tests, lint, build and local render verified. |
| S1.3 On-chain evidence | DONE | Homepage links to a Panta mainnet SecondaryLimitOrder transaction verified through Solana RPC, with explicit scope wording; local render, tests, lint and build verified. |
| S1.4 Demote Wallet + Execution | DONE | Wallet and execution now live in a secondary Optional tools section, top navigation collapses them into Tools, and unavailable execution is a compact neutral state. Tests, lint, build and local render verified. |
| S1.5 Reduce Market Explorer noise | DONE | Default explorer prioritizes observed/priced markets, suppresses clearly marked test fixtures when credible alternatives exist, limits the judge-facing default to six, and preserves full catalog access through search/filter. Tests, lint, build and local default/search renders verified. |
| S1.6 Market detail provenance | DONE | Market detail labels Panta API, Panta Signal and Solana evidence sources and exposes Explorer links for valid trade signatures. Tests, lint, build and local detail render verified. |

### Submission Sprint S1 result

S1 is complete.

- Judge-facing homepage story is clear and SolanaCZE/Colosseum-first.
- Signal hero emphasizes movement, activity and evidence rather than internal implementation metrics.
- A verified Panta mainnet transaction provides one-click Solana proof.
- Wallet and execution are secondary optional tools.
- Market Explorer is curated for a cleaner judge-facing default while preserving full catalog access.
- Market detail explicitly separates Panta API data, durable Panta Signal observations and Solana-verifiable activity.
- No speculative historical reconstruction was added.
- No wallet signing or financial action was required.

### Submission Sprint S2 — SolanaCZE proof

| Task | State | Goal |
| --- | --- | --- |
| S2.1 Production judge-flow verification | DONE | Production homepage and live market detail verified after S1; real Solana trade signatures and Explorer paths are present. |
| S2.2 Homepage clarity correction | DONE | Competition homepage reduced to one product story: detect change → validate activity → verify on Solana. Resolved catalog cards and optional wallet/execution blocks removed from the judge-facing homepage. |
| S2.3 Public registry discovery | DONE | Market discovery now follows the same public `/events` registry source used by the Panta dashboard, then hydrates each PDA through the existing market-detail API. |
| S2.4 Panta program relationship | DONE | Judge-facing Solana proof now links both a real Panta transaction and the executable Panta mainnet program account. |
| S2.5 Execution-path integrity check | DONE | Static/code-path audit confirms quote → build → explicit wallet sign+broadcast → Panta submit → bounded verify remains wired and validated. No transaction was signed or broadcast during the audit. |

Next: S3 submission packaging and judge-flow polish.

### Submission Sprint S3 — Packaging

| Task | State | Goal |
| --- | --- | --- |
| S3.1 Desktop production smoke | DONE | Production homepage, live registry shortlist, market detail, Solana transaction proof and Panta program proof verified over production HTTP. |
| S3.2 Mobile visual smoke | TODO | Final visual check at mobile viewport before screenshots/video. |
| S3.3 Competition README | DONE | README reduced to the product story, architecture, verified Solana relationship, setup and validation. |
| S3.4 Submission copy | DONE | `SUBMISSION.md` contains core description plus SolanaCZE, Colosseum and Panta-specific framing. |
| S3.5 Demo script | DONE | `DEMO_SCRIPT.md` contains a 60–90 second silent/low-voice flow with English on-screen captions. |
| S3.6 Screenshot/evidence capture | TODO | Final desktop/mobile screenshots and selected Explorer proof assets. |
| S3.7 Demo video | TODO | Record final release candidate; no real transaction required. |
| S3.8 Final submissions | TODO | Colosseum + SolanaCZE first, then Panta Sidetrack from the same release candidate. |

Production catalog finding — 2026-10-02:

- Current live Panta API returns 7 catalog markets.
- 1 market is currently active (`secondary`): Manchester United vs Spurs.
- 6 markets are already `resolved`.
- This is upstream Panta catalog state, not a local filtering bug.
- Judge-facing homepage now shows only `primary` / `secondary` markets.
- A broken `$zcat` card image came from a non-Cloudinary Google image URL while Next Image is configured only for Cloudinary. Resolved cards are no longer shown on the homepage, and non-Cloudinary images fall back to a safe placeholder instead of a broken image.

Discovery correction:

- Public Panta dashboard source inspection shows that dashboard discovery uses `MarketAPI.events.getEventRegistry() -> /events`, not the limited `/markets/` catalog we initially used.
- Public registry endpoint: `https://production-api.balr.fun/api/v1/events`.
- Registry currently exposes 193 events total and 13 current, unresolved markets (9 `secondary_active`, 4 `open`).
- Canonical detail hydration currently marks 2 of those registry-current rows as `cancelled`; the homepage therefore filters on canonical `primary` / `secondary` phase before ranking and limiting.
- Panta Signal now uses that public read-only registry only for discovery.
- Each discovered PDA is still hydrated through the existing Panta market-detail API for canonical title, current probability, phase and volume.
- Local `pk_test_` environments intentionally skip live hydration so a sandbox fixture cannot overwrite every registry market with the same test record.
- Judge-facing homepage suppresses any registry row that still lacks a canonical human title after hydration; raw PDA fallback labels are never presented as competition market names.
- Panta mainnet program `6gM5afTQBq5VZCfgpGqcsqzfWd5maLSCKWtGjbEobZMp` was independently verified through Solana RPC as an executable account owned by the upgradeable BPF loader.
- Manchester 24h trade activity was independently cross-checked on Solana: four event-account transactions touched the market in the window, exactly two were successful `PrimaryOrderUsdc` trade instructions; the other two were graduation instructions (one failed). Therefore the app's `2 trades / 24h` count is correct for that market.

Audit conclusion:

- No global redesign is required.
- The core Signal Feed should remain intact.
- The next work is mostly hierarchy, wording, provenance and one concrete Solana evidence path.
- Avoid adding new research, charts or wallet features during S1.

Implementation proceeds only if the research establishes:

- a deterministic source of historical price/probability,
- clear protocol semantics,
- reproducible results across multiple real trades,
- acceptable agreement with known Panta observations,
- practical API/RPC cost and latency,
- no dependence on private keys or transaction signing.

If those conditions are not met, retain the current architecture:

- Panta trade tape for immediate historical **activity**,
- durable Panta Signal snapshots for historical **probability movement**.

### Safety boundary

All v2 investigation is read-only. Public Solana transaction signatures/accounts may be inspected. No wallet signing, transaction broadcast, market creation or financial action is required for this investigation.

---

## Function 3 — Solana Execution

**PAUSED until Function 2 is DONE.**

The existing non-custodial quote/build/sign/submit/verify implementation remains intact. A real signed transaction will be handled only when this becomes the active function and the user explicitly approves the financial action.

