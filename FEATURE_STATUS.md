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
| F1v2.1 Verify all official historical-data surfaces | NEXT | Re-check current Panta docs and official playground for any historical price/state endpoint or trade-price field. |
| F1v2.2 Inspect real trade transactions on Solana | TODO | Use existing public trade signatures read-only; inspect instructions, logs, account changes and touched market accounts. |
| F1v2.3 Test historical price reconstruction | TODO | Determine whether an exact YES/NO probability can be derived at each trade timestamp. |
| F1v2.4 Validate against known observations | TODO | Compare reconstructed values with our durable snapshots/current Panta detail; quantify mismatch. |
| F1v2.5 Decide source hierarchy | TODO | Decide whether reconstruction is exact enough to supplement/replace snapshot-only movement history. |
| F1v2.6 Implement only if superior | TODO | Backfill history and integrate it into the canonical Signal model only if accuracy/reliability is demonstrated. |
| F1v2.7 Production verification | TODO | Re-run tests, production smoke and Signal Feed consistency audit. |

### Decision gate

Do **not** implement reconstructed historical prices merely because a plausible formula can be invented.

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

