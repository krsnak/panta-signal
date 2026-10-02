# Panta Signal — Competition Roadmap

> **Execution policy:** development now proceeds one user-facing function at a time. The active function must be functionally complete, production-verified, visually understandable, and recorded before the next function starts. See [FEATURE_STATUS.md](./FEATURE_STATUS.md) for the authoritative feature state and short-task log.

## Active development focus

**Function 1 — Signal Feed: COMPLETE (2026-10-02)**

Function 1 passed its functional, production, reliability and desktop browser audit.

**Priority reset — 2026-10-02:** Function 1 v2 Historical Price Reconstruction is paused after F1v2.2. The research proved useful protocol facts but did not prove complete, exact primary-market historical probability coverage. Further reconstruction work is now backlog, not submission-critical work.

The active objective is a **competition submission sprint**:

1. **SolanaCZE Track — primary target.**
2. **Colosseum Crypto World's Fair — same production build, broader product/startup framing.**
3. **Panta API Sidetrack — secondary submission using the same application and existing meaningful Panta integration; no extra speculative research scope.**

From this point, work is prioritized by what a judge can see, understand and verify in a short demo. New research is accepted only when it directly removes a submission blocker.

Signal Feed must combine:

- current Panta market detail,
- durable probability history,
- public trade activity,
- freshness / data-quality state,

into one immediately understandable answer to:

> What changed, by how much, and is there real activity behind it?

The implementation was intentionally split into short, independently verifiable tasks to avoid long-running work sessions and to keep project state recoverable after interruptions. The authoritative completion evidence and acceptance checklist are in [FEATURE_STATUS.md](./FEATURE_STATUS.md).

## Current implementation checkpoint — 2026-10-02

Completed:
- catalog-first homepage; live spot prices no longer block page TTFB
- async per-market quote hydration with visibility-based loading
- homepage cold TTFB measured at ~1.1s and warm at ~0.5s after the change
- Panta request timeout / retry / cache policy
- wallet lookup moved client-side so it cannot block the full page
- Solana public-key validation and graceful upstream wallet errors
- contract + input-validation test suite (18 passing tests)
- Postgres-capable durable history implementation behind `DATABASE_URL`
- signal snapshot collector endpoint with controlled concurrency
- production collector refuses ephemeral history when `DATABASE_URL` is missing
- Signal Pulse hero replaces arbitrary featured-market positioning
- Solana order flow now includes bounded Panta verify polling and a Solana Explorer receipt
- public GitHub CI verifies npm install, tests, lint, production build, and high/critical dependency audit
- quote state is explicit: live / cached / unavailable / resolved
- successful UI quote hydration also records authoritative durable snapshots as a collector fallback
- guarded create-market bootstrap API is prepared for a controlled primary-market demo, but remains disabled by default
- persistent Neon/Postgres history is connected in production
- production Signal Feed uses a canonical signal model combining live detail, durable probability observations and 24h trade activity
- public trade amounts are normalized from Panta's 1e6 base units
- production Signal Feed and market detail share identical signal facts/explanations
- Function 1 production audit completed with 35/35 tests passing at the final v1 gate

External integration blockers:
- no blocking external integration issue is currently known for the submission sprint
- a real Phantom transaction remains a valuable optional proof, but it is **not** a submission blocker unless a competition requirement explicitly makes it one; any spend/broadcast still requires explicit user approval
- GitHub scheduled collection has been unreliable; production history remains durable through Postgres and successful live quote/detail observations. Scheduler work is deferred unless the live demo shows a concrete reliability gap

Function 1 v1 is signal-complete under its documented acceptance criteria. Its current limitation is historical depth: 24h trade activity is immediately available from Panta, while 24h probability movement requires either accumulated Panta Signal snapshots or a future validated retrospective reconstruction path.

## Mission

Build one production-quality application that can be submitted to three aligned competitions, with explicit priority:

1. **SolanaCZE Track — PRIMARY** — make the Solana integration obvious, meaningful, demonstrably on-chain, and easy to judge.
2. **Colosseum Crypto World's Fair — PRIMARY** — present Panta Signal as a credible product/startup, not a one-off demo.
3. **Panta API Sidetrack — SECONDARY** — reuse the same build to demonstrate a meaningful, reliable Panta API integration without expanding scope for sidetrack-only research.

The project should feel like a **native intelligence layer inside the Panta ecosystem**: familiar market UX, Panta-native data, but with added signal tracking, wallet exposure, probability history, and transaction intelligence.

## Competition positioning

### Panta API Sidetrack

Primary story:
> Panta Signal turns Panta's market catalog, live spot prices, public trade tape, wallet positions, and non-custodial primary-buy flow into a practical intelligence and execution interface.

What must be visible:
- Panta catalog data and images.
- Panta market detail and live spot pricing when RPC is available.
- Panta public trade tape.
- Panta wallet positions.
- Panta primary order quote/build/submit/verify flow.
- Clear graceful handling when Panta RPC is temporarily unavailable.
- Explicit attribution: Powered by Panta.

### SolanaCZE Track

Primary story:
> Panta Signal is not only a REST dashboard. It exposes the complete Solana transaction path behind a Panta market action.

**Full execution flow already implemented / optional stretch demo:**

```text
Phantom connect
  -> wallet public key shown
  -> Panta wallet positions loaded
  -> user selects YES or NO
  -> Panta quote created
  -> Panta build returns Solana instructions
  -> VersionedTransaction assembled
  -> Phantom requests signature
  -> signed transaction broadcast to Solana
  -> transaction signature shown with Explorer link
  -> Panta submit / verify confirms result
  -> wallet positions refresh
```

The implemented flow must remain real and non-custodial; it must not be represented by fake buttons or mocked success states. For the submission sprint, the minimum P0 proof is verifiable Solana/Panta on-chain activity plus the real quote/build transaction path. Broadcasting a new mainnet transaction is optional and requires explicit user approval.

### Colosseum Crypto World's Fair

Primary story:
> Prediction markets expose probabilities, but raw market feeds do not tell users which prices are actively discovered, which are untouched starting prices, what has moved, or what their wallet is exposed to. Panta Signal adds that intelligence layer while preserving non-custodial Solana execution.

The global submission must emphasize:
- Functionality and code quality.
- Product execution and UX.
- Meaningful use of Solana.
- Differentiation from a generic prediction-market frontend.
- Open-source repository.
- Clear path to a real product.
- Concise two-minute explanation and demo.

---

# Product definition

## Core user problems

1. A 50/50 market may be an untouched starting price rather than real crowd consensus.
2. Panta spot pricing can depend on live RPC availability.
3. Users need to distinguish active price discovery, initial markets, resolved markets, and temporarily unavailable quotes.
4. Wallet holders need a quick view of current Panta exposure.
5. A prediction-market user needs a transparent path from signal discovery to a signed Solana transaction.
6. Raw market data does not provide historical movement or a concise explanation of what changed.

## Product pillars

## Product hierarchy — signal first, market catalog second

Panta Signal must **not** present itself as a clone of the Panta market catalog.
Panta provides the market infrastructure, pricing, positions, and order flow.
Panta Signal must make its own intelligence features obvious within the first screen.

Homepage priority:

1. **Top Mover / Signal Pulse hero**
   - strongest observed 1h / 24h probability movement
   - current YES / NO
   - probability-point change
   - volume context
   - observation count / data freshness
   - mini price-history chart
   - Inspect signal action
2. **Signal Feed**
   - top movers
   - newly active markets
   - volume acceleration where supported by real observations
   - live / cached / unavailable data state
3. **Wallet Intelligence**
   - connected wallet
   - positions and exposure
   - claimable / outcome state
   - mark-to-market where a usable price exists
4. **Solana Execution**
   - visible path from signal to Panta quote/build and Phantom signature
   - transaction / Explorer / Panta verify status
5. **Market Explorer**
   - supporting discovery tool, not the core product
6. **Resolved markets**
   - archive/filter only
   - never consume prime homepage real estate

The first screen should answer:

> What moved, by how much, how reliable/fresh is the observation, what am I exposed to, and can I act on it?

It should not primarily answer:

> What markets exist?

### Truthfulness rule

Top Movers and Signal Pulse must only appear when durable real history supports them.
Until enough observations exist, the product must show an explicit data-collection state rather than fabricate movement or promote an arbitrary market as a signal.

### Function 1 v2 research — retrospective history

**PAUSED / BACKLOG after F1v2.2.**

The investigation established that Panta's production frontend reconstructs parts of its history from Solana transactions, that exact secondary order prices can be decoded on-chain, and that primary history still lacks proven exact post-trade probability coverage without heuristic fallback.

This is sufficient research for the hackathon submission. Do not continue to F1v2.3 unless:

- the submission is otherwise ready, or
- exact historical reconstruction becomes a direct blocker for judging/demo quality.

The production truthfulness rule remains unchanged: trade-tape YES/NO amounts are activity data, not automatically historical prices, and no heuristic implied-price formula enters the canonical Signal model.

---

# Submission sprint — active roadmap

## Sprint S1 — Judge-first product pass
**Priority: P0**

Goal: a judge understands the product within the first 30 seconds.

- [x] Homepage states the problem and value proposition in one screen.
- [ ] Signal Feed remains the hero capability; no research/debug concepts on the first screen.
- [x] One clearly active live market demonstrates current probability + activity + freshness.
- [x] Market detail explains where the data comes from and distinguishes Panta API, durable history and Solana evidence.
- [x] Remove or demote UI that looks unfinished, empty, duplicated or non-essential.

### S1 audit — 2026-10-02

Production homepage audit completed against the live deployment and current source.

Current strengths:

- The headline already explains that Panta Signal is about **change + meaning**, not merely market discovery.
- The canonical Signal Feed hero is the strongest and most differentiated part of the product.
- Current YES/NO, movement, 24h trades, shares, volume, observation count and freshness are all grounded in real Panta data.
- The market detail page is technically strong: it combines current quote, signal explanation, durable history and recent trades without inventing missing data.
- Wallet lookup and the non-custodial execution path are implemented honestly and fail gracefully.

Current judge-facing weaknesses:

- The header still labels the product **API Sidetrack**, which conflicts with the new SolanaCZE/Colosseum-first strategy.
- The first screen gives equal navigation weight to Signal Feed, Wallet, Execute and Markets, weakening the single product story.
- Three coverage counters (`Observations`, `Markets tracked`, `Price movers`) occupy prime hero space but do not explain user value to a first-time judge.
- The primary signal card is information-rich, but the key takeaway is buried among four equal metric boxes and internal language such as `observations`, `activity state`, `durable history` and `quote state`.
- Wallet Intelligence appears too early for the current submission story. It is useful, but secondary.
- The Solana Execution block currently leads with an unavailable-primary-market warning. For a judge, this creates a visible negative state before the product has shown the stronger read-only on-chain proof.
- Market Explorer is long and visually substantial, making the product drift back toward a generic Panta catalog.
- The live catalog currently includes obvious test/noisy markets. These are valid upstream records but should not dominate the polished judge experience.
- Market detail has good data provenance internally, but the user must infer it. Panta API data, durable Panta Signal observations and Solana-verifiable activity should be explicitly labelled as three evidence sources.

### S1 implementation order

#### S1.1 — Rewrite the first-screen story

- Replace the `API Sidetrack` header badge with a neutral product descriptor such as `Solana market intelligence`.
- Keep one primary headline and one concise supporting line.
- Replace the three coverage counters with one compact evidence strip:
  - live Panta market data,
  - durable observations,
  - Solana-verifiable activity.
- Keep Signal Feed as the only dominant hero CTA.

Acceptance gate: within one screen, a new viewer can answer **what the product does, what makes it different, and which data is real**.

**DONE 2026-10-02**

- Header badge now says `Solana market intelligence`.
- Added a concise `Panta intelligence layer on Solana` positioning label.
- Hero headline now explains signal interpretation + real trading support + Solana verification in one sentence.
- Replaced internal coverage KPI cards with an evidence strip:
  - Live Panta market data
  - Durable observations
  - Solana-verifiable activity
- Local rendered homepage verified after the change.

#### S1.2 — Simplify the Signal hero

- Preserve current probability and movement as the dominant numbers.
- Keep trade activity as supporting evidence.
- Reduce internal implementation language in the visible hierarchy.
- Convert `Observations`, freshness and source state into small trust/provenance labels rather than equal-weight KPIs.
- Add one short sentence explaining the signal in plain product language.

Acceptance gate: the hero can be understood without knowing Panta Signal's internal data architecture.

**DONE 2026-10-02**

- Added one plain-language signal takeaway directly below the grounded signal explanation.
- Reduced the main KPI row to three judge-relevant facts: probability movement, 24h trades and market volume.
- Moved durable observation count, YES/NO traded shares and quote state into compact trust labels.
- Replaced internal right-column labels with simpler `Signal`, `Freshness` and `Evidence`.
- Preserved all canonical Signal data and fallback behavior; no model or API semantics changed.

#### S1.3 — Add explicit on-chain evidence

- Add a compact `Verified on Solana` evidence element tied to a real public Panta transaction/signature.
- Link to Solana Explorer.
- Explain that Panta market activity is backed by Solana transactions; do not imply that every displayed probability point is reconstructed on-chain.
- Use this as the primary SolanaCZE proof before asking the user to connect a wallet.

Acceptance gate: a judge can click from Panta Signal to a real Panta-related Solana transaction in one action.

**DONE 2026-10-02**

- Added a dedicated `Verified on Solana` block directly below the Signal hero.
- Linked a Panta mainnet `SecondaryLimitOrder` transaction that was verified through public Solana RPC to Solana Explorer.
- Added explicit scope language: the link proves public Panta market activity on Solana and does **not** imply that every historical probability point is reconstructed on-chain.
- Added compact trust labels for `Mainnet`, `SecondaryLimitOrder` and `Public Panta transaction`.

#### S1.4 — Demote Wallet + Execution

- Move Wallet Intelligence below the core Signal + on-chain evidence story.
- Keep execution available, but present it as `Optional non-custodial execution path`, not a primary homepage promise.
- Replace the large `no primary market available` warning with a compact truthful state.
- Do not require a new signed transaction for S1.

Acceptance gate: unavailable execution cannot make the product appear broken.

**DONE 2026-10-02**

- Signal queue is now a full-width core section instead of sharing equal visual weight with wallet/execution.
- Wallet and execution are grouped below it as `Optional tools`.
- Top navigation now uses a single `Tools` entry instead of separate Wallet/Execute entries.
- Execution is labelled `Optional Solana Execution`.
- The no-primary-market state is now a compact neutral status instead of a large amber warning.
- No wallet or transaction behavior changed.

#### S1.5 — Reduce Market Explorer noise

- Keep Market Explorer, but visually demote it below signals/on-chain proof.
- Exclude clearly marked test markets from the default judge-facing list where this can be done truthfully without altering upstream data.
- Prefer markets with usable quote/activity data first.
- Preserve search/filter access for the full live catalog.

Acceptance gate: first visible market cards look like a credible production product, not an API dump.

**DONE 2026-10-02**

- Market Explorer is visually demoted beneath the core Signal, Solana proof and optional tools flow.
- Default ordering prioritizes markets already observed by Panta Signal, then markets with usable catalog pricing/volume.
- Clearly marked test/sandbox/fixture markets are suppressed from the default judge-facing list when credible alternatives exist.
- Default view is capped at six highlighted markets.
- Search/category queries still expose the matching full live catalog, including test entries when explicitly requested.
- If a local/sandbox environment contains only a test fixture, it remains visible rather than producing a misleading empty catalog.

#### S1.6 — Market detail provenance pass

- Add a compact evidence/provenance row:
  - `Panta API` — market/current quote,
  - `Panta Signal` — durable observations/movement,
  - `Solana` — public activity/signatures.
- Preserve current truthful fallback states.
- Add Explorer links to transaction signatures in Recent trades where a valid signature exists.

Acceptance gate: data origin is obvious without reading technical documentation.

**DONE 2026-10-02**

- Added an `Evidence sources` row directly on market detail.
- `Panta API` identifies market identity/current quote/phase/volume.
- `Panta Signal` identifies durable observations, movement and interpretation.
- `Solana` identifies public transaction signatures as independently auditable activity evidence.
- Recent trade rows now link valid Solana signatures directly to Explorer.
- Invalid/missing signatures are not converted into links.

### S1 completion gate

**COMPLETE — 2026-10-02**

The judge-first product pass is complete. The next active sprint is **S2 — SolanaCZE proof**, starting with a production verification of the new judge flow before adding any new feature.

## Sprint S2 — SolanaCZE proof
**Priority: P0**

Goal: make meaningful Solana usage visible and auditable without turning the project into a wallet-engineering project.

- [x] Production judge-flow smoke after S1.
- [ ] Show the Panta/Solana program relationship clearly in the product or demo.
- [x] Surface a real public Solana transaction/signature and Explorer path where available.
- [x] Demonstrate that Panta market activity is verifiably on-chain.
- [ ] Keep the existing non-custodial quote/build/sign/submit path intact.
- [ ] A real wallet transaction is optional until it is explicitly approved; do not block the submission on spending funds if the read-only on-chain proof tells the product story sufficiently.

### S2 production verification — 2026-10-02

**DONE**

- Production deployment contains the full S1 judge flow:
  - Solana-first positioning,
  - Signal hero,
  - Verified on Solana proof,
  - Optional tools,
  - curated live market explorer.
- Live market API returned 7 markets.
- Production market checked:
  - Manchester United vs Spurs market
  - phase: secondary
  - YES 51.8% / NO 48.2%
  - volume: $11
- Market detail showed:
  - 26 durable observations,
  - 2 public trades in the last 24h,
  - explicit Panta API / Panta Signal / Solana provenance.
- Both displayed recent trades exposed valid Solana signatures with Explorer links.
- No new feature or wallet transaction was required for this verification.

Next S2 task: make the public Panta program relationship explicit enough that a SolanaCZE judge can see which on-chain program/activity the product is observing without reading repository documentation.

### S2 homepage clarity correction — 2026-10-02

**DONE**

The production screenshot exposed a product-story problem: technically valid modules were presented together as a dense dashboard, and the catalog visually over-emphasized resolved 0/100 markets.

Correction:

- Homepage now explains the product in three explicit steps:
  1. Detect change
  2. Validate activity
  3. Verify on Solana
- Removed the empty `More signals` section from the competition homepage.
- Removed Wallet Intelligence and Solana Execution from the homepage. Their code is preserved; execution remains available on market detail when applicable.
- Homepage catalog now displays only active `primary` / `secondary` Panta markets.
- Resolved markets are no longer a judge-facing homepage feature.
- Non-Cloudinary market images use a safe placeholder instead of rendering a broken Next Image.

Current upstream constraint:

- Panta API currently exposes 7 markets to this production integration.
- Only 1 is active; the other 6 are resolved.
- Therefore the competition UI must not pretend there is a broad live market set when the upstream catalog does not currently provide one.

## Sprint S3 — Submission packaging
**Priority: P0**

- [ ] Final production smoke on mobile + desktop.
- [ ] README trimmed to the competition story and reproducible setup.
- [ ] 60–120 second silent/low-voice demo with English on-screen captions.
- [ ] Prepare one core project description, then adapt only the framing for SolanaCZE, Colosseum and Panta.
- [ ] Capture production URL, GitHub URL, screenshots and transaction/on-chain evidence.
- [ ] Submit SolanaCZE and Colosseum first; submit Panta sidetrack from the same release candidate.

## Sprint S4 — Only after submission blockers are cleared
**Priority: P2**

- Function 1 v2.3+ historical reconstruction.
- Additional wallet intelligence.
- Advanced charts / analytics.
- Scheduler improvements beyond what is required for a stable demo.
- Any redesign not tied to judge comprehension or submission requirements.

### 1. Market Discovery
- Panta-native market catalog.
- Category / phase / search filters.
- Explicit segmentation:
  - Trading now
  - Initial / no trades yet
  - Resolved
  - Quote temporarily unavailable
- Market images and volume.
- No invented titles or prices.

### 2. Signal Intelligence
- Persistent time-series snapshots.
- Top Movers based only on observed Panta prices.
- 24h market chart.
- Deterministic grounded insight:
  - current probability
  - previous probability
  - point change
  - volume context
- No fake AI claims.
- Optional LLM summary only after the deterministic layer is reliable.

### 3. Wallet Intelligence
- Validate Solana public key locally before calling Panta.
- Load Panta positions asynchronously; wallet lookup must never block page rendering.
- Show:
  - YES / NO side
  - shares
  - market title
  - phase / outcome
  - claimable state where available
  - estimated mark-to-market value where a spot price is available
- Graceful upstream error handling.

### 4. Solana Execution
- Phantom / Wallet Standard connection.
- Public wallet address only.
- Panta quote.
- Panta build.
- Compile real VersionedTransaction from Panta instructions.
- Wallet signature.
- Broadcast to Solana using a defined RPC.
- Display transaction signature and Explorer link.
- Panta submit / verify.
- Refresh positions after confirmation.
- Never request or store seed phrase/private key.

### 5. Reliability
- Catalog-first rendering.
- Spot-price hydration must not block the full page.
- Explicit timeout per upstream request.
- Retry only retryable failures (429, 5xx, network timeout).
- Respect Retry-After.
- Cache stable catalog data.
- Short cache for live spot prices.
- Preserve last-known-good spot price with timestamp, never silently present stale data as live.
- Visible data state: live / cached / unavailable.

---

# Current audit baseline

## Confirmed working
- Live Panta authentication with server-side API key.
- Panta catalog and categories.
- Market detail route.
- Public market trades.
- Wallet positions endpoint.
- Solana public-key validation.
- Panta primary quote/build/submit/verify routes.
- Phantom transaction code path exists.
- Public deployment on Vercel.
- GitHub repository is public.
- Panta images render.

## Confirmed weaknesses
- Public Panta spot prices are intermittently unavailable because market detail depends on RPC availability.
- Panta/Cloudflare can intermittently return 5xx/504.
- Public catalog has sometimes returned incomplete metadata.
- Current history on Vercel uses ephemeral /tmp and is not durable.
- History collection is visit-driven rather than scheduled.
- Homepage originally made too many detail calls; this has been reduced but must be redesigned catalog-first.
- Current wallet address in the demo can legitimately have zero Panta positions.
- Primary-buy path has not yet been proven end-to-end with a real signed/broadcast Solana transaction.
- No final transaction receipt / Explorer UX.
- No automated integration test suite for Panta response variants.
- No durable observability / health indicator.
- Demo video and competition submissions are not finished.

---

# Architecture target

```text
                         +-----------------------+
                         |      Panta API        |
                         | catalog / prices /    |
                         | trades / positions /  |
                         | quote-build-verify    |
                         +-----------+-----------+
                                     |
                                     v
+-------------+            +---------+----------+
|   Browser   | <--------> | Next.js BFF layer |
| Panta-style |            | auth / normalize / |
| UI          |            | cache / timeouts   |
+------+------+            +---------+----------+
       |                             |
       |                             +--------------------+
       |                                                  |
       v                                                  v
+------+-----------+                              +-------+--------+
| Phantom / Wallet|                              | Durable history |
| Standard        |                              | database        |
+------+-----------+                              +-------+--------+
       |                                                  ^
       v                                                  |
+------+-----------+                              +-------+--------+
| Solana RPC      |                              | scheduled       |
| send transaction|                              | snapshot worker |
+------+-----------+                              +----------------+
       |
       v
 Solana network
```

---

# Delivery roadmap

## Phase 0 — Freeze scope and acceptance gates
**Priority: P0**

Before more styling, define what “finished” means.

A release is not competition-ready unless all P0 gates pass:

- [ ] Homepage cold load has useful catalog content within 2 seconds target, 4 seconds hard ceiling.
- [ ] A failed spot-price request cannot break homepage or detail page.
- [ ] No market title is invented when authoritative metadata is missing.
- [ ] Wallet lookup works without full-page reload.
- [ ] Invalid Solana wallet gets a clear local validation error.
- [ ] Valid wallet with no positions produces a valid empty state.
- [ ] Upstream 429/5xx/504 produces a graceful retryable state.
- [ ] At least one real primary market can complete quote -> build.
- [ ] Phantom connection works.
- [ ] A real Solana transaction can be signed and broadcast with explicit user approval.
- [ ] Panta submit/verify confirms the transaction.
- [ ] Transaction signature is displayed with Explorer link.
- [ ] Position state refreshes after confirmation.
- [ ] History survives deployment / instance changes.
- [ ] Top Movers is calculated from durable real snapshots.
- [ ] No critical button is decorative.
- [ ] No secret is present in the browser bundle or Git.
- [ ] README explains architecture, data states, and Solana flow.

## Phase 1 — Data reliability and performance
**Priority: P0**

### 1.1 Catalog-first homepage
- Render catalog metadata from GET /markets/ immediately.
- Do not wait for spot price for every card.
- Hydrate spot prices asynchronously for a controlled subset:
  - featured
  - visible cards
  - trading-by-volume markets
- Limit concurrency.
- Abort slow calls.
- Do not retry 400/401/403/404.
- Retry 429/5xx/timeouts with bounded exponential backoff + jitter.

### 1.2 Last-known-good price cache
Store:
- marketId
- YES price
- NO price
- observedAt
- source status

UI states:
- **Live** — current request succeeded.
- **Cached 42s ago** — current RPC failed but a recent snapshot exists.
- **Unavailable** — no usable current/recent price.
- **Resolved** — final outcome, not a live quote.

Never display cached values as if they are current.

### 1.3 Metadata integrity
- Catalog title/description/image is authoritative.
- Detail response enriches price, not identity.
- If detail metadata is incomplete, merge from catalog.
- If catalog metadata is missing, hide the card from featured/trading sections and log it as upstream data quality.

### 1.4 Response normalization tests
Create fixtures for:
- complete market.
- catalog market with null prices.
- incomplete detail response.
- resolved 100/0.
- 429.
- 500.
- Cloudflare HTML 502/503/504.
- slow timeout.
- malformed JSON.

Acceptance:
- Same normalized PantaMarket shape for every safe case.
- No uncaught error reaches a page.

## Phase 2 — Durable Signal engine
**Priority: P0/P1**

Replace /tmp history.

### Data model
```text
market_snapshots
- id
- market_id
- yes_probability
- no_probability
- volume_usdc
- phase
- captured_at
- source_status

markets_cache
- market_id
- title
- description
- image_url
- category
- phase
- status
- volume_usdc
- updated_at
```

Preferred simple options:
- Vercel-compatible Postgres / Neon / Supabase.

### Collector
- Scheduled every 5 minutes.
- Load catalog once.
- Select active / relevant markets.
- Controlled concurrency for detail spot-price calls.
- Persist only successful observations.
- Never fabricate missing price.
- Log upstream failures separately.

### Signal output
- 1h / 24h probability delta.
- volume delta if reliable.
- latest price age.
- number of observations.
- confidence/data-quality indicator based on observations, not predictive confidence.

Acceptance:
- Survives redeploy.
- Two Vercel instances see the same history.
- 24h chart is real after sufficient observations.
- Top Movers never relies on page visits.

## Phase 3 — Wallet and portfolio
**Priority: P0 for SolanaCZE**

### Wallet UX
- Phantom connect button.
- Manual address lookup remains available.
- Connected wallet address visible and copyable.
- Positions load client-side.

### Position enrichment
For each distinct marketId:
- fetch/resolve market metadata.
- obtain current or last-known price.
- estimate:
  - shares
  - side
  - mark-to-market value
  - claimable state
- show stale timestamp when using cached quote.

Acceptance:
- invalid wallet.
- valid wallet/no positions.
- valid wallet/one or more positions.
- upstream positions 504.
- market-price unavailable for one position.
- page remains usable in all cases.

## Phase 4 — Real Solana transaction golden path
**Priority: highest P0 for SolanaCZE**

This is the most important new implementation.

### 4.1 Wallet integration
- Prefer current Solana Wallet Standard / maintained Phantom path.
- Detect Phantom cleanly.
- Connect/disconnect.
- Preserve no private data beyond public key.

### 4.2 Quote
- User chooses YES or NO.
- User specifies USDC amount.
- Validate minimum amount.
- Show:
  - quote amount
  - expected shares
  - average price
  - fee
  - quote expiry countdown

### 4.3 Build
- Call Panta primaryorderbuild.
- Validate non-empty instructions.
- Show transaction preparation state.
- Requote on QUOTE_STALE / expiry.

### 4.4 Sign and broadcast
- Convert Panta instruction account metadata correctly.
- Compile VersionedTransaction.
- Use a defined Solana RPC for sendRawTransaction / wallet-supported broadcast.
- Wait for commitment.
- Never auto-sign.
- User explicitly approves Phantom prompt.

### 4.5 Panta confirmation
- primaryordersubmit.
- primaryorderverify.
- Poll with bounded timeout until confirmed / failed / expired.
- Show:
  - status
  - signature
  - Explorer link
  - expected vs confirmed result

### 4.6 Refresh
- Refresh Panta positions.
- Refresh market price.
- Record snapshot.
- Show “Position updated” if indexer has caught up.
- Handle indexer lag explicitly.

### Competition demo gate
A recorded end-to-end run must show:
1. Phantom connect.
2. Wallet address.
3. YES/NO choice.
4. Panta quote.
5. Phantom signature prompt.
6. Solana transaction signature.
7. Explorer transaction page.
8. Panta confirmed state.
9. Updated position or explicit indexer-pending state.

A tiny real transaction may be used only with explicit user approval and a deliberately limited amount.

## Phase 5 — Panta-native professional UX
**Priority: P1**

Goal: feel familiar to a Panta user, but not pretend to be the official Panta site.

### Homepage
- Panta-inspired graphite environment.
- Category / state navigation.
- Featured / volume / live / initial / resolved.
- Compact cards:
  - image
  - category
  - title
  - YES/NO
  - volume
  - live/cached/unavailable state
- Intelligence badge where a signal exists.
- No empty decorative sections.

### Market workspace
Panta-like structure:
- left: market header / image / rule / market data.
- center: Signal Intelligence and real price-history chart.
- right sticky panel: wallet + quote/trade.
- lower:
  - recent trades
  - position for connected wallet
  - transaction history/status

### Trust UX
Every dynamic price visibly identifies:
- Live
- Cached + age
- Unavailable
- Resolved

## Phase 6 — Observability and failure UX
**Priority: P1**

### Health
Internal health endpoint:
- Panta catalog latency.
- Panta detail latency.
- positions latency.
- DB status.
- last successful collector run.
- latest snapshot age.

Do not expose secrets.

### Logging
Structured server logs:
- endpoint family
- status
- latency
- Panta error code
- timeout
- cache hit/miss

### UI
Never show raw Cloudflare HTML.
Translate upstream errors into:
- quote temporarily unavailable.
- wallet positions temporarily unavailable.
- rate limited; retry in N seconds.
- authentication configuration error (admin-only wording).

## Phase 7 — Security audit
**Priority: P0 before submission**

- [ ] PANTA_API_KEY server-only.
- [ ] no .env committed.
- [ ] no secret in Vercel client env.
- [ ] no private key / seed handling.
- [ ] validate all public keys.
- [ ] validate all numeric order inputs.
- [ ] max slippage bounded.
- [ ] transaction accounts are taken only from Panta build response.
- [ ] user sees exact action before Phantom approval.
- [ ] CSP / external-image domains reviewed.
- [ ] dependency audit reviewed manually; no blind force upgrade.
- [ ] API error bodies sanitized before UI.
- [ ] request timeouts on every external call.
- [ ] basic abuse/rate protection on our proxy routes.

## Phase 8 — Automated test program
**Priority: P0/P1**

### Unit tests
- normalization.
- status mapping.
- price selection.
- error parsing.
- wallet validation.
- history delta math.
- stale-price state.

### Contract tests against fixtures
- documented Panta list response.
- documented detail response.
- documented positions response.
- documented trades response.
- quote/build/submit/verify responses.
- Cloudflare/non-JSON upstream error.

### Integration tests
- server Panta client with mocked upstream.
- homepage does not fail if all detail calls fail.
- detail page works from catalog fallback.
- wallet route returns:
  - 400 invalid wallet
  - 200 empty
  - 503 upstream outage

### Browser/E2E
- homepage/search/filter.
- open market.
- wallet manual lookup.
- Phantom unavailable state.
- Phantom connect state.
- quote UI.
- sandbox quote/build.
- real transaction golden path manually before recording.

### Performance budgets
- homepage catalog content TTFB: target <2s, hard gate <4s.
- warm markets endpoint: target <1s.
- detail page: target <1s when cache is warm.
- wallet lookup: target <2s excluding upstream incident.
- no page render waits for 20 spot-price calls.

## Phase 9 — Product validation
**Priority: P1 for Colosseum**

Before submission:
- 3–5 external testers.
- Ask each tester to:
  - find an active market.
  - explain whether a 50/50 price is active or initial.
  - connect/lookup wallet.
  - understand Signal Insight.
  - complete the transaction path in safe conditions.
- Record:
  - confusing points.
  - bugs.
  - time-to-first-useful-action.
- Fix repeated friction.

No fabricated users, metrics, partnerships, or transactions.

## Phase 10 — Submission assets
**Priority: P0 by deadline**

### Demo video
Target 90–120 seconds.

Structure:
1. **Problem (10–15s):** raw prediction-market prices can be misleading without activity/context.
2. **Panta-native discovery (20s):** active vs initial vs resolved, live/cached state.
3. **Signal (15s):** real observed movement/history.
4. **Solana golden path (40–50s):** Phantom -> quote -> sign -> Explorer -> Panta verify -> positions.
5. **Close (10s):** one product, Panta-native intelligence + Solana execution.

### README
Must contain:
- product problem.
- screenshots/GIF.
- architecture.
- Panta API endpoints used.
- exact Solana flow.
- reliability strategy.
- local setup.
- security assumptions.
- competition submissions.

### Submission text variants
Create one factual base description, then emphasize:

**Panta**
- depth of API integration.
- reliability handling.
- intelligence layer.

**SolanaCZE**
- Wallet Standard / Phantom.
- VersionedTransaction.
- Solana RPC broadcast.
- Explorer proof.
- on-chain confirmation.
- meaningful Solana usage.

**Colosseum**
- product problem.
- differentiation.
- technical execution.
- user value.
- future business/product direction.

---

# Timeline to October 12

## Oct 1–2 — Stability foundation
- Panta client hardening.
- catalog-first architecture.
- response fixtures/tests.
- async wallet lookup.
- durable DB selected and connected.
- collector skeleton.

**Gate:** no page-breaking upstream error.

## Oct 3–4 — Durable signals
- persistent snapshots.
- scheduled collector.
- chart.
- Top Movers.
- last-known-good price cache.

**Gate:** history survives redeploy and gives real movement.

## Oct 4–5 — Solana golden path
- wallet integration cleanup.
- quote/build UX.
- real transaction compile/sign/broadcast.
- submit/verify.
- Explorer receipt.
- positions refresh.

**Gate:** one complete user-approved transaction demonstrated end-to-end.

## Oct 5–6 — Panta-native UX
- homepage polish.
- market workspace.
- connected-wallet states.
- reliability badges.
- mobile/responsive pass.

**Gate:** no decorative/dead controls.

## Oct 6–7 — Demo Day candidate build
- complete regression suite.
- security audit.
- performance audit.
- external tester pass.
- rehearse 2-minute demo.

**Target:** Demo-Day-quality build by Oct 7.

## Oct 8–9 — Product validation and polish
- fix tester feedback.
- final screenshots.
- README/architecture.
- submission wording.

## Oct 10 — Release candidate
- freeze features.
- full clean deployment.
- final transaction proof.
- final E2E regression.

## Oct 11 — Submission package
- record final video.
- verify every link.
- prepare Colosseum, Panta, SolanaCZE forms.

## Oct 12 — Submit
- Colosseum first.
- Panta Sidetrack.
- SolanaCZE Track.
- archive exact submitted commit/deployment URL.

---

# Release gates

## Gate A — Reliable data
No page fails because Panta detail RPC is unavailable.

## Gate B — Real intelligence
Top Movers and charts are persistent and based on real observations.

## Gate C — Real wallet functionality
Positions lookup handles success, empty, invalid, rate-limited, and upstream-failure states.

## Gate D — Real Solana functionality
A user-approved transaction has been signed, broadcast on Solana, linked in Explorer, and verified by Panta.

## Gate E — Professional UX
The app looks and behaves like a native Panta ecosystem product, while clearly branding itself as Panta Signal.

## Gate F — Submission ready
Demo video, README, repo, deployment, Colosseum entry, Panta entry, and SolanaCZE entry all point to the same release candidate.

---

# Explicit non-goals before submission

Do not spend time on:
- building a new prediction-market protocol.
- custom smart contracts unless a hard requirement appears.
- generic AI chat.
- cosmetic features without a working backend path.
- unsupported social/chat features.
- speculative metrics.
- mobile-native app.
- major framework rewrites.

Optional LLM-generated summaries remain post-P0; deterministic grounded Signal Insight is sufficient for the core product.

---

# Definition of done

Panta Signal is competition-ready when a judge can open the public URL and, without explanation:

1. understand which Panta markets are actively priced versus untouched/resolved,
2. open a reliable market workspace,
3. see real market history and a grounded movement signal,
4. connect Phantom or inspect a Solana wallet,
5. create a Panta YES/NO quote,
6. approve a real Solana transaction,
7. see the transaction on Explorer,
8. see Panta verify it,
9. see the portfolio/position state update,
10. understand why this is more than a generic frontend over a REST API.

