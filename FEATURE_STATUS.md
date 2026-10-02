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

## Function 3 — Solana Execution

**PAUSED until Function 2 is DONE.**

The existing non-custodial quote/build/sign/submit/verify implementation remains intact. A real signed transaction will be handled only when this becomes the active function and the user explicitly approves the financial action.

