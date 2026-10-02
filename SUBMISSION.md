# Panta Signal — Submission Pack

## Core project description

Panta Signal is a prediction-market intelligence layer for Panta on Solana. It turns raw market prices and public trade activity into a concise signal: what changed, whether real trading supports the move, and how to verify the activity on-chain. The app combines Panta's public market registry and API with durable probability observations and Solana transaction evidence. A non-custodial Panta quote/build/sign/submit/verify path is also implemented for primary markets, while all signing remains explicitly user-approved.

## Problem

Prediction-market interfaces show prices, but a price alone does not tell a user whether the market is actually moving, whether trading activity is present, or whether that activity can be independently audited.

## Solution

Panta Signal adds an intelligence and provenance layer:

- discover current Panta markets,
- show live YES/NO probability,
- measure movement from durable observations,
- summarize recent public trade activity,
- link transaction signatures to Solana Explorer,
- expose the Panta mainnet program,
- preserve an optional non-custodial execution path.

## Why Solana matters

Public Panta transactions and the Panta program are directly exposed as verification evidence. The execution workflow also compiles Panta-provided instructions into a Solana VersionedTransaction and requires explicit wallet approval before broadcast.

Panta program:
`6gM5afTQBq5VZCfgpGqcsqzfWd5maLSCKWtGjbEobZMp`

## SolanaCZE framing

Panta Signal demonstrates a practical Czech-built Solana application where blockchain activity is part of the product's trust model. A user can move from a market signal to real Panta activity and independently verify the transaction and executable Panta program on Solana. The same product also contains a non-custodial transaction path for primary Panta markets.

## Colosseum framing

Panta Signal makes prediction-market data easier to understand and audit. Instead of duplicating a market dashboard, it combines market discovery, deterministic movement signals, trade activity and on-chain evidence into one product. It is deployed, uses live Panta data, stores durable observations and exposes verifiable Solana activity.

## Panta API Sidetrack framing

Panta Signal is built around practical Panta API usage: market discovery, canonical market detail, live probability, trade activity, positions and primary-order quote/build/submit/verify. The project adds a durable intelligence layer while preserving Panta as the source of truth for current market and execution data.

## Links

Production: https://panta-signal.vercel.app  
GitHub: https://github.com/krsnak/panta-signal  
Panta program: https://explorer.solana.com/address/6gM5afTQBq5VZCfgpGqcsqzfWd5maLSCKWtGjbEobZMp

## Evidence checklist

- [x] Production app
- [x] Public GitHub repository
- [x] Live Panta market data
- [x] Public Panta event-registry discovery
- [x] Durable Postgres probability observations
- [x] Recent Panta trade activity
- [x] Solana transaction Explorer link
- [x] Panta executable mainnet program link
- [x] Non-custodial quote/build/sign/submit/verify implementation
- [x] Tests, lint and production build
- [ ] Final desktop screenshot set
- [ ] Final mobile screenshot set
- [ ] 60–120 second demo video
- [ ] Colosseum submission
- [ ] SolanaCZE submission
- [ ] Panta Sidetrack submission

## Claims to avoid

Do not claim:

- every historical Panta probability is reconstructed from chain,
- a limit order is necessarily an executed fill unless execution is independently proven,
- all Panta markets are highly liquid,
- a new mainnet transaction was performed for the demo unless explicitly user-approved and actually completed.
