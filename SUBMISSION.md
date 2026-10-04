# Panta Signal — Submission Pack

## Core project description

Panta Signal is a Panta-native signal and execution companion on Solana. It is designed to complement Panta's existing market interface and Panta Intelligence rather than duplicate them. Panta Intelligence explains *why* a market may move; Panta Signal focuses on *what changed now*, whether real trading activity confirms the move, and how a user can verify or act on that signal. The app combines Panta's public market registry and API with durable probability observations, public trade activity and Solana transaction evidence. Secondary execution stays inside Panta's official Email Login / embedded-wallet / order-book flow, while supported primary markets can use Panta's non-custodial quote/build/sign/submit/verify API path with an external Solana wallet.

## Problem

Panta already provides market discovery, pricing, trading and qualitative market research through Panta Intelligence. What is missing is a concise real-time layer that answers whether anything meaningful is changing *now*, whether trading activity supports that move, and whether the evidence can be independently verified.

## Solution

Panta Signal adds a complementary signal, provenance and action layer:

- discover current Panta markets,
- show live YES/NO probability,
- measure movement from durable observations,
- summarize recent public trade activity,
- link transaction signatures to Solana Explorer,
- expose the Panta mainnet program,
- move from a validated signal into a non-custodial Panta execution path when the market type is supported.

## Why Solana matters

Public Panta transactions and the Panta program are directly exposed as verification evidence. The preferred demo executes through Panta's native secondary-market flow and then verifies the resulting public Solana activity. The direct primary execution workflow additionally compiles Panta-provided instructions into a Solana VersionedTransaction and requires explicit wallet approval before broadcast.

Panta program:
`6gM5afTQBq5VZCfgpGqcsqzfWd5maLSCKWtGjbEobZMp`

## SolanaCZE framing

Panta Signal demonstrates a practical Czech-built Solana product where on-chain activity is part of the user journey, not decorative infrastructure. A user can move from a live Panta signal to Panta-native wallet-backed execution and independently verify the resulting transaction and Panta program on Solana. The login abstraction does not change the underlying Solana transaction proof.

## Colosseum framing

Panta Signal extends an existing prediction-market product with a clear new use case: real-time signal detection, activity validation, wallet action and on-chain verification. It does not attempt to rebuild Panta or create another generic dashboard. The release candidate is deployed, uses live Panta data, stores durable observations and exposes verifiable Solana activity.

## Panta API Sidetrack framing

Panta Signal is built around practical Panta API usage: market discovery, canonical market detail, live probability, trade activity, positions and primary-order quote/build/submit/verify. The added value is the signal layer between Panta Intelligence and trading: detect a meaningful change, validate it against Panta activity, act through Panta, and verify the result on Solana. Primary execution is available directly in Panta Signal through an external Solana wallet; secondary markets hand off to Panta's official Email Login, embedded wallet and live order book rather than duplicating its trading engine. Panta remains the source of truth for current market and execution data.

## Product positioning guardrail

Panta Signal must remain a **Panta ecosystem companion**, not a standalone prediction-market clone.

The intended workflow is:

`Panta market context / Intelligence -> Panta Signal -> Panta trade -> Solana verification`

The product should therefore prioritize:

- meaningful signal detection over generic market browsing,
- real Panta activity over synthetic AI commentary,
- Panta-native execution over a custom trading protocol,
- Solana verification over decorative blockchain branding,
- one release candidate that can be framed appropriately for all three competitions.

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
