# Panta Signal

Panta Signal is a Panta-native prediction-market intelligence and execution layer built for the Crypto World's Fair. One production codebase is being prepared for three aligned submissions: the **Panta API Sidetrack**, the **SolanaCZE Track**, and the **global Colosseum Crypto World's Fair**.

The product goal is deliberately broader than a REST dashboard: market discovery and signals should lead into a visible, real Solana flow — **Phantom connect → Panta positions → YES/NO quote → Panta build → VersionedTransaction → wallet signature → Solana broadcast → Panta submit/verify → refreshed position state**.

See [ROADMAP.md](./ROADMAP.md) for the competition strategy, reliability audit, implementation phases, test matrix, release gates, and submission plan.

## Current MVP

- Next.js + TypeScript dashboard
- live market explorer with search/category/phase filters
- market detail with YES/NO spot prices and public trade tape
- read-only Solana wallet positions
- local 24h probability snapshot history
- Top Movers derived only from observed snapshots
- deterministic Signal Insight grounded in stored Panta data
- 24h YES probability chart once at least two snapshots exist
- non-custodial Panta primary-buy quote/build/sign/submit/verify flow
- explicit `Powered by Panta` attribution
- server-side Panta API client and proxy route
- live market catalog, categories and filters
- live YES/NO spot prices from Panta market detail
- safe sample-data fallback when no API key is configured

The current `pk_test_` key returns Panta's sandbox fixture market. In test mode the buy flow can safely demonstrate quote/build responses without broadcasting a mainnet transaction.

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

1. finish catalog-first / async spot-price hydration so live RPC latency cannot block the full page
2. replace ephemeral history storage with durable storage and scheduled collection
3. complete and prove the real Phantom → Solana → Panta transaction golden path
4. add automated contract/integration/E2E coverage for documented Panta success and failure shapes
5. finish Panta-native market workspace UX and record the competition demo

## Submission checklist

- [x] working deployed demo
- [x] meaningful live Panta API integration
- [x] market discovery and market detail
- [x] read-only wallet positions
- [x] non-custodial Panta transaction workflow implemented
- [ ] real user-approved Solana transaction proven end-to-end with Explorer receipt
- [ ] durable market history and scheduled snapshot collector
- [ ] automated Panta contract/integration tests
- [ ] SolanaCZE submission
- [x] clear `Powered by Panta` attribution
- [x] README and architecture notes
- [ ] demo video
- [ ] official Colosseum Crypto World's Fair submission
- [ ] Panta Sidetrack submission on Superteam Earn
