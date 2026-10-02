# Security Model

Panta Signal is a non-custodial application. The application server holds a Panta API key, but it never holds or requests a user's Solana private key or seed phrase.

## Trust boundaries

### Browser
The browser may hold:
- the connected Solana public key,
- unsigned Panta quote/build responses,
- a wallet-approved transaction signature,
- public market/position data.

The browser must never receive:
- `PANTA_API_KEY`,
- `DATABASE_URL`,
- `CRON_SECRET`,
- any user private key or seed phrase.

### Panta Signal server
The server:
- authenticates to Panta with `X-Api-Key`,
- normalizes/catalog-caches Panta data,
- validates proxy-route inputs,
- stores public market observations in Postgres,
- never signs a Solana transaction.

### Phantom / Solana wallet
The wallet is the only component that can approve/sign a user transaction.

The execution path is:

```text
Panta quote
  -> Panta build (unsigned instructions)
  -> VersionedTransaction in browser
  -> explicit wallet approval
  -> Solana broadcast
  -> Panta submit / verify
```

No auto-signing is implemented.

## Input validation

Server routes validate:
- Solana public keys,
- YES / NO side,
- positive USDC amounts with at most 6 decimals,
- slippage as an integer between 0 and 5000 bps,
- quote/order/create session ids,
- base58 transaction signature shape,
- Panta market categories,
- public HTTP(S) image/source URLs,
- create-market timestamp ordering.

Panta remains the authoritative validator for protocol state, balances, market phase, quote expiry, slippage, and on-chain transaction semantics.

## Upstream failure handling

Panta Signal treats upstream 429/5xx/timeouts as transient failures. It does not fabricate missing prices.

Quote states are explicitly represented as:
- `live`
- `cached` (last successful durable observation)
- `unavailable`
- `resolved`

Cached prices are labeled as cached and are never persisted again as fresh observations.

## Durable data

Market observations are stored in Postgres when `DATABASE_URL` is configured. Production collection refuses to pretend `/tmp` storage is durable.

The signal engine records only successful authoritative Panta spot observations.

## Admin bootstrap

The create-market bootstrap API is disabled unless:

```text
PANTA_MARKET_BOOTSTRAP_ENABLED=true
```

It exists only to prepare a controlled primary market for the competition demo if needed. Creating a live Panta market can incur an on-chain USDC creation fee and therefore must not be enabled/executed without explicit operator approval.

## Dependency audit

CI executes:

```bash
npm audit --omit=dev --audit-level=high
```

The current release has no high or critical npm audit findings.

The legacy `@solana/web3.js` 1.x dependency currently carries moderate transitive advisories through `jayson`. npm's available automated fix is a semver-major migration to web3.js 3.x. We do not apply that migration blindly before the competition release. The application currently uses web3.js for public-key parsing and transaction construction/signing hand-off rather than exposing a generic JSON-RPC server to untrusted input.

## Secrets

Required production secrets/configuration:
- `PANTA_API_KEY`
- `PANTA_API_BASE_URL`
- `DATABASE_URL`
- `CRON_SECRET`

Optional guarded bootstrap:
- `PANTA_MARKET_BOOTSTRAP_ENABLED`

Secrets must remain server-side and must never use a `NEXT_PUBLIC_` prefix.

## Reporting

Before release, any suspected secret exposure should be treated as compromised:
1. revoke/rotate the affected credential,
2. remove it from source/history if applicable,
3. redeploy,
4. verify server/client bundles and logs.

