# Panta Signal

Panta Signal is a Panta-native prediction-market intelligence and execution layer built for the Crypto World's Fair. One production codebase is being prepared for three aligned submissions: the **Panta API Sidetrack**, the **SolanaCZE Track**, and the **global Colosseum Crypto World's Fair**.

The product goal is deliberately broader than a REST dashboard: market discovery and signals should lead into a visible, real Solana flow — **Phantom connect → Panta positions → YES/NO quote → Panta build → VersionedTransaction → wallet signature → Solana broadcast → Panta submit/verify → refreshed position state**.

See [ROADMAP.md](./ROADMAP.md) for the competition strategy, reliability audit, implementation phases, test matrix, release gates, and submission plan.

Development is **feature-gated**: one user-facing function is completed and production-verified before the next begins. The authoritative implementation state and short-task log are in [FEATURE_STATUS.md](./FEATURE_STATUS.md). **Function 1 — Signal Feed is complete; Function 2 has not been started under this workflow.**

## Current release

- Next.js + TypeScript dashboard
- live market explorer with search/category discovery and detail-hydrated market state
- market detail with YES/NO spot prices and public trade tape
- read-only Solana wallet positions
- durable Neon/Postgres probability snapshot history
- canonical Signal Feed combining current Panta detail, durable price history and 24h trade activity
- Top Movers derived only from verified probability observations
- deterministic Signal Insight grounded in real Panta data
- 24h YES probability chart once at least two snapshots exist
- non-custodial Panta primary-buy quote/build/sign/submit/verify flow
- explicit `Powered by Panta` attribution
- server-side Panta API client and proxy route
- live market catalog and categories
- live YES/NO spot prices from Panta market detail
- safe sample-data fallback when no API key is configured

Production uses a live Panta API key server-side. A local test key may still be used for sandbox development, but it is not the production data source.

### Signal Feed historical-data model

Panta provides current market detail plus a public trade tape. This gives Panta Signal immediate access to real 24h activity such as trade count, normalized YES/NO shares, signatures and last-trade time.

Panta's public trade rows do not currently expose an explicit historical post-trade YES/NO spot probability. Therefore Function 1 v1 uses durable Postgres snapshots of live market detail for historical probability movement.

The next planned investigation, **Function 1 v2 — Historical Price Reconstruction**, will determine whether those existing trade signatures and Solana on-chain data can reconstruct historical probabilities retroactively. It will be implemented only if the result is demonstrably exact/reliable enough to improve on snapshot-only history. See [FEATURE_STATUS.md](./FEATURE_STATUS.md).

## Local setup

```bash
npm install
npm run dev
```

Live API configuration:

```bash
PANTA_API_KEY=pk_test_...
PANTA_API_BASE_URL=https://live-api.panta.market/api/v1/
```

The API key is read server-side only. Browser code never receives it. The integration follows the current documented Panta response shapes for `GET /markets/`, `GET /markets/{marketId}/`, and `GET /categories/`.

## Architecture

```text
Browser
  -> Next.js server components/routes
      -> Panta API client wrapper
          -> Panta API

Wallet flow
  Panta quote/build
      -> user's Solana wallet signature
          -> Solana RPC
              -> Panta submit/verify
```

## Competition-critical Solana flow

For the SolanaCZE submission, the Solana path must be clearly visible in both the product and the demo. It is not sufficient to expose only Panta REST data. The release candidate must prove:

1. Phantom / Solana wallet connection.
2. Read-only Panta positions for the connected wallet.
3. Real Panta YES/NO quote.
4. Real Panta build response with Solana instructions.
5. VersionedTransaction assembly.
6. Explicit user signature in Phantom.
7. Broadcast to Solana.
8. Transaction signature + Explorer link.
9. Panta submit / verify confirmation.
10. Position refresh or an explicit indexer-pending state.

No seed phrase or private key is ever requested or stored.

## Next implementation slices

1. Function 1 v2 research: determine whether historical YES/NO probability can be reconstructed from Panta trade signatures / Solana state
2. if validated, add retrospective price-history backfill to the canonical Signal model
3. only after the v2 decision, explicitly start Function 2 — Wallet Intelligence
4. later complete and prove the real Phantom → Solana → Panta transaction golden path
5. finish submission/demo packaging after product functions pass their own gates

## Submission checklist

- [x] working deployed demo
- [x] meaningful live Panta API integration
- [x] market discovery and market detail
- [x] read-only wallet positions
- [x] non-custodial Panta transaction workflow implemented
- [ ] real user-approved Solana transaction proven end-to-end with Explorer receipt
- [x] durable market history in Postgres
- [x] automated Signal/Panta normalization and behavior tests
- [ ] stronger reliable scheduled collection mechanism if still needed after Function 1 v2 history research
- [ ] SolanaCZE submission
- [x] clear `Powered by Panta` attribution
- [x] README and architecture notes
- [ ] demo video
- [ ] official Colosseum Crypto World's Fair submission
- [ ] Panta Sidetrack submission on Superteam Earn
