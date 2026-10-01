# Panta Signal

Panta Signal is a focused Crypto World's Fair / Panta API Sidetrack prototype for turning prediction-market data into a fast intelligence dashboard.

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

## Next implementation slices

1. optionally connect an external LLM provider for generated insight; the grounding layer is already implemented
2. replace local history storage with durable storage before multi-instance production deployment
3. record a concise working demo

## Submission checklist

- [x] working deployed demo
- [x] meaningful live Panta API integration
- [x] market discovery and market detail
- [x] read-only wallet positions
- [x] non-custodial Panta transaction workflow implemented
- [x] clear `Powered by Panta` attribution
- [x] README and architecture notes
- [ ] demo video
- [ ] official Colosseum Crypto World's Fair submission
- [ ] Panta Sidetrack submission on Superteam Earn
