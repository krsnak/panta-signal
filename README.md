# Panta Signal

Panta Signal is a Panta-native real-time signal layer on Solana.

It is designed to sit alongside Panta's existing market UI and Panta Intelligence, not replace them. Panta Intelligence provides qualitative market context; Panta Signal answers what is happening *now* and what the user can do next.

It answers four questions:

1. **What changed?** — current YES/NO probability and observed movement.
2. **Is real market activity behind it?** — recent Panta trades and traded shares.
3. **Can I act on it?** — non-custodial primary execution in-app, with a Panta-native handoff for secondary order-book markets.
4. **Can I verify it?** — public Solana signatures and the Panta mainnet program.

Production: https://panta-signal.vercel.app  
Repository: https://github.com/krsnak/panta-signal

## Why it exists

Prediction markets expose prices, but a price alone does not explain whether a market is moving, whether anyone is trading, or whether the activity is independently verifiable.

Panta Signal combines live Panta market data, durable probability observations, public trade activity and transaction evidence into one concise workflow:

`Detect -> Validate -> Trade -> Verify`

## Current judge flow

- Open the homepage and see a meaningful Panta signal when one exists.
- Read the current probability, observed movement and 24h trade activity.
- Open the market detail for provenance and recent trades.
- For a secondary market, continue into Panta's official Email Login / embedded-wallet / order-book flow.
- Return to the public activity evidence and follow the resulting transaction signature to Solana Explorer.

The homepage only shows active markets with a canonical human-readable title. Resolved, cancelled and metadata-incomplete rows are not used as judge-facing showcase cards.

## Data sources

### Panta public registry

Market discovery follows the same public event registry used by the Panta dashboard:

`https://production-api.balr.fun/api/v1/events`

The registry is used for discovery, category and imagery.

### Panta API

Canonical market detail is hydrated through the Panta API for market title, live YES/NO probability, phase, volume, public trades, and the primary quote/build/submit/verify flow.

The Panta API key is server-side only and is never exposed to browser code.

### Panta Signal observations

Live probability snapshots are stored in Postgres. These observations provide deterministic historical movement without inventing historical probabilities that Panta does not explicitly expose in public trade rows.

### Solana

Panta mainnet program:

`6gM5afTQBq5VZCfgpGqcsqzfWd5maLSCKWtGjbEobZMp`

The account has been independently verified through Solana RPC as executable. A real Panta mainnet transaction is linked directly from the homepage as one-click proof.

### Read-only secondary order book PoC

`GET /api/panta/markets/[marketId]/orderbook` reconstructs the current secondary book directly from Panta-owned Solana accounts. It resolves the market program and quote asset from the public registry, filters `OrderNode` and `PriceLevel` accounts by Anchor discriminator and event PDA, decodes their Borsh fields, removes uninitialized and zero-remaining nodes, and returns exact decimal strings for executable price, remaining shares and total quote value. The response always identifies itself as `source: "solana-onchain"`.

The implementation is deliberately read-only: it only uses `getProgramAccounts` and `getSlot`. It contains no wallet, signing, instruction-building or transaction-submission path.

Run the live BTC <58k diagnostic with:

```bash
npm run diagnose:orderbook
```

To inspect another event PDA:

```bash
PANTA_MARKET_ID=BpPmo7wHrh8bi3ea2ohiVy64sxEnSTufx67zTA9ntnfT npm run diagnose:orderbook
```

Current limitations:

- `order_intent` is the maker's intent. Panta's “Sell Opportunities” / “Buy Opportunities” labels describe the taker's executable action, so the reader maps maker BUY to taker SELL and maker SELL to taker BUY. Both values are returned so this inference remains auditable.
- Filled nodes can remain allocated until reaped. The reader excludes nodes whose `is_initialized` is false, remaining `amount` is zero, or price is zero; cancelled/closed accounts are absent from `getProgramAccounts`.
- Price-level and order-node reads use confirmed commitment but are separate RPC calls, not an atomic snapshot. A concurrent fill may briefly make level aggregates and node counts disagree.
- The current Panta client uses 9 share decimals for SOL books and 6 for USDC books, while secondary prices use a 9-decimal fixed-point scale for both. Other quote assets are rejected rather than guessed.
- The decoder is tied to the current public Anchor IDL account discriminators and exact account sizes (269-byte `OrderNode`, 218-byte `PriceLevel`). A program layout upgrade requires updating and retesting the decoder.

The production UI now uses the same read-only on-chain reader to distinguish
**Tradeable now** from **No immediate liquidity** on secondary markets. This is
kept separate from 24h fill activity: recent trades do not guarantee an
executable counterparty now, and a resting live order can exist without a
recent completed fill.

The market catalog now prioritizes secondary markets with executable on-chain
orders, followed by primary markets, then inactive secondary markets. Tradeable
secondary cards also show the best current taker BUY and SELL opportunity,
including outcome, executable price and quote asset, before the user opens
Panta's trading interface.

Secondary detail pages use the order-book reader's registry-resolved quote asset
as the display source of truth. Solana RPC reads use one short bounded retry so
a transient RPC failure is less likely to appear to users as unavailable
liquidity; a genuine empty book still renders as **No immediate liquidity**.

Primary execution is only exposed when the registry trading window is active.
An `open` registry status alone is not treated as executable: future-start
markets are shown as scheduled instead of presenting a Review button that the
Panta primary-order API will reject.

## Trade-count verification

The Manchester market showed **2 trades in the last 24h** in the Panta API.

Independent Solana verification found:

- 4 event-account transactions in the inspected 24h window,
- 2 successful `PrimaryOrderUsdc` transactions,
- 2 `GraduateBreakingEventUsdc` operations, one failed.

Therefore the app's 2-trade figure correctly excludes non-trading protocol operations.

## Solana execution path

A non-custodial primary-order path is implemented:

`Panta quote -> Panta build -> VersionedTransaction -> explicit wallet approval -> Solana broadcast -> Panta submit -> bounded Panta verify`

The application never requests or stores a seed phrase or private key. No mainnet transaction is automatically signed or broadcast.

Secondary markets use Panta's live limit-order interface and native Email Login / embedded Solana wallet flow. Panta Signal deliberately hands those markets to the official Panta market page rather than reimplementing or simulating Panta's authentication, wallet or order book. This keeps execution Panta-native while preserving Panta Signal's role as the signal, validation and verification layer.

## Stack

- Next.js 16 + TypeScript
- Tailwind CSS
- Panta API + public event registry
- Solana Web3.js
- External Solana wallet provider for direct primary execution (Phantom currently supported)
- Neon/Postgres
- Vercel

## Local setup

```bash
npm install
npm run dev
```

Environment:

```bash
PANTA_API_KEY=pk_test_...
PANTA_API_BASE_URL=https://live-api.panta.market/api/v1/
DATABASE_URL=...
```

## Validation

- 42 automated tests passing
- ESLint passing
- production build passing
- public registry discovery verified
- canonical active-market filtering verified
- Solana program account verified
- Manchester trade count corroborated on-chain
- quote/build/sign/submit/verify path audited without a real transaction

## Competition framing

The same release candidate is intended for:

- **SolanaCZE** — meaningful Solana integration and auditable Panta activity.
- **Colosseum Crypto World's Fair** — a working end-user product with a clear signal-to-action use case on Solana.
- **Panta API Sidetrack** — an ecosystem extension built around practical Panta market, trade and execution APIs.

See [SUBMISSION.md](./SUBMISSION.md) and [DEMO_SCRIPT.md](./DEMO_SCRIPT.md).
