# Panta Signal — 60–90 Second Demo

The demo can be recorded without spoken English. Use short English captions on screen.

## Core story

`Panta context -> Detect -> Validate -> Trade on Panta -> Verify on Solana`

The preferred recording uses a **real secondary-market trade through Panta's native Email Login / embedded-wallet flow**. Panta Signal does not impersonate Panta's login or order book.

## 0–8s — Context

Show a Panta market with **Panta Intelligence** visible, then switch to Panta Signal.

Caption:

**Panta Intelligence explains the market. Panta Signal shows what is changing now.**

## 8–25s — Detect + validate

Show the featured Signal Feed card.

Point at:

- current YES / NO price,
- meaningful movement if available,
- 24h trades,
- market volume / freshness.

Caption:

**Live Panta data + durable observations + real public trading activity.**

If there is no meaningful signal, do not fake one. Use an active secondary market and show the market-detail signal/activity instead.

## 25–38s — Market detail

Open **Inspect signal**.

Show:

- Evidence sources,
- observed signal,
- recent Panta trades,
- Solana signatures.

Caption:

**The signal is evidence-backed. No synthetic price history or fake activity.**

## 38–55s — Trade through Panta

For a secondary market click **Trade on Panta**.

On panta.market:

1. use Panta's native **Email Login** if authentication is required,
2. use the embedded Solana wallet created/managed by Panta's native flow,
3. choose YES or NO,
4. place a small real order only after explicit approval,
5. show Panta's confirmation.

Caption:

**Execution stays Panta-native: official login, wallet and order book.**

Do not expose email codes, recovery details, seed phrases, private keys or unrelated wallet balances.

## 55–72s — Verify the result

Return to Panta Signal after the trade.

Refresh the same market/activity view and show the new public trade if Panta indexing has completed.

Then open its Solana transaction.

Caption:

**The resulting Panta activity is independently verifiable on Solana.**

If Panta's public indexer has not surfaced the trade yet, show the confirmed transaction on Solana and state that indexer propagation is pending. Do not claim the trade is in Panta Signal until it actually appears.

## 72–82s — Optional primary proof

Only if a suitable primary market exists during recording:

- connect an external Solana wallet,
- show the direct Panta quote/build flow,
- stop before signing unless a second real trade is explicitly desired.

Caption:

**Primary markets can also use direct non-custodial Solana wallet execution.**

This is optional. The main competition demo does not depend on a primary market being available.

## 82–90s — Close

Show the homepage hero.

Caption:

**Panta Signal — Detect. Validate. Trade. Verify.**

Optional final caption:

**Built for Panta API Sidetrack + SolanaCZE + Colosseum.**

## Recording rules

- Record at production URL: https://panta-signal.vercel.app
- Use Panta's official secondary-market UI for the real demo trade.
- Prefer a small amount that Panta accepts; do not force exactly $1 if the market/order minimum differs.
- Never show environment variables, API keys, email verification codes, seed phrases or private keys.
- A real transaction must always require explicit user approval.
- Keep the recording under 90 seconds if possible.
- Prefer cursor movement and captions over narration.
