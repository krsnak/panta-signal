import {
  clusterApiUrl,
  Connection,
  PublicKey,
  type Commitment,
  type GetProgramAccountsFilter,
} from "@solana/web3.js";
import {
  decodeOrderNode,
  decodePriceLevel,
  isActivePriceLevel,
  isLiveOrderNode,
  normalizeOrderNode,
  PANTA_ORDER_NODE_DISCRIMINATOR,
  PANTA_ORDER_NODE_EVENT_OFFSET,
  PANTA_ORDER_NODE_SIZE,
  PANTA_PRICE_LEVEL_DISCRIMINATOR,
  PANTA_PRICE_LEVEL_EVENT_OFFSET,
  PANTA_PRICE_LEVEL_SIZE,
  sortExecutableOpportunities,
  type PantaOpportunity,
  type PantaOutcome,
  type PantaTakerAction,
} from "./panta-orderbook-core";

export const PANTA_PROGRAM_ID = "6gM5afTQBq5VZCfgpGqcsqzfWd5maLSCKWtGjbEobZMp";
const PUBLIC_REGISTRY_URL = "https://production-api.balr.fun/api/v1/events";
const COMMITMENT: Commitment = "confirmed";

type RegistryEvent = {
  eventPda?: string;
  quoteAsset?: string | null;
  programId?: string | null;
};

type ReaderOptions = {
  connection?: Connection;
  programId?: string;
  quoteAsset?: string;
  rpcRetries?: number;
};

export type PantaOrderBook = {
  source: "solana-onchain";
  marketId: string;
  programId: string;
  quoteAsset: string;
  slot: number;
  observedAt: string;
  counts: {
    priceLevelAccounts: number;
    activePriceLevels: number;
    orderNodeAccounts: number;
    activeOrders: number;
    buyOpportunities: number;
    sellOpportunities: number;
  };
  best: Record<PantaTakerAction, Record<PantaOutcome, PantaOpportunity | null>>;
  opportunities: {
    buy: PantaOpportunity[];
    sell: PantaOpportunity[];
  };
  limitations: string[];
};

export class PantaOrderBookError extends Error {
  status: number;

  constructor(message: string, status = 503) {
    super(message);
    this.name = "PantaOrderBookError";
    this.status = status;
  }
}

function discriminatorBase58(bytes: Buffer) {
  return new PublicKey(Buffer.concat([Buffer.alloc(24), bytes])).toBase58().replace(/^1+/, "");
}

// PublicKey padding is not a general base58 encoder. These values are the
// Anchor discriminators above, encoded once and checked by decoder tests.
const ORDER_NODE_DISCRIMINATOR_BASE58 = "dxBq2nSkWYs";
const PRICE_LEVEL_DISCRIMINATOR_BASE58 = "gYXWMXd27UV";

if (
  discriminatorBase58(PANTA_ORDER_NODE_DISCRIMINATOR) !== ORDER_NODE_DISCRIMINATOR_BASE58 ||
  discriminatorBase58(PANTA_PRICE_LEVEL_DISCRIMINATOR) !== PRICE_LEVEL_DISCRIMINATOR_BASE58
) {
  throw new Error("Panta account discriminator constants are inconsistent");
}

async function getRegistryIdentity(marketId: string) {
  const response = await fetch(PUBLIC_REGISTRY_URL, {
    headers: { Accept: "application/json" },
    next: { revalidate: 30 },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new PantaOrderBookError(`Panta registry ${response.status}`);
  const body = (await response.json()) as { data?: RegistryEvent[] };
  const event = (body.data ?? []).find((row) => row.eventPda?.trim() === marketId);
  if (!event) throw new PantaOrderBookError("Market is not present in the public Panta registry", 404);
  return {
    programId: event.programId?.trim() || PANTA_PROGRAM_ID,
    quoteAsset: event.quoteAsset?.trim().toUpperCase() || "UNKNOWN",
  };
}

function shareDecimalsForQuoteAsset(quoteAsset: string) {
  // This follows the current Panta client: SOL books use 9 share decimals and
  // USDC books use 6. Unknown assets are rejected rather than guessed.
  if (quoteAsset === "SOL") return 9;
  if (quoteAsset === "USDC") return 6;
  throw new PantaOrderBookError(`Unsupported Panta quote asset: ${quoteAsset}`);
}

function filters(size: number, discriminator: string, eventOffset: number, marketId: string) {
  return [
    { dataSize: size },
    { memcmp: { offset: 0, bytes: discriminator } },
    { memcmp: { offset: eventOffset, bytes: marketId } },
  ] satisfies GetProgramAccountsFilter[];
}

export async function readPantaOrderBook(
  marketId: string,
  options: ReaderOptions = {},
): Promise<PantaOrderBook> {
  let market: PublicKey;
  try {
    market = new PublicKey(marketId);
  } catch {
    throw new PantaOrderBookError("Invalid Solana market address", 400);
  }
  const normalizedMarketId = market.toBase58();
  const registry =
    options.programId && options.quoteAsset
      ? { programId: options.programId, quoteAsset: options.quoteAsset.toUpperCase() }
      : await getRegistryIdentity(normalizedMarketId);

  let program: PublicKey;
  try {
    program = new PublicKey(options.programId || registry.programId);
  } catch {
    throw new PantaOrderBookError("Registry returned an invalid Solana program address");
  }
  const quoteAsset = (options.quoteAsset || registry.quoteAsset).toUpperCase();
  const shareDecimals = shareDecimalsForQuoteAsset(quoteAsset);
  const connection =
    options.connection ??
    new Connection(
      process.env.PANTA_SOLANA_RPC_URL?.trim() ||
        process.env.SOLANA_RPC_URL?.trim() ||
        clusterApiUrl("mainnet-beta"),
      COMMITMENT,
    );
  const rpcRetries = Math.max(0, options.rpcRetries ?? 1);
  let snapshot:
    | Awaited<
        ReturnType<
          typeof Promise.all<[
            ReturnType<Connection["getProgramAccounts"]>,
            ReturnType<Connection["getProgramAccounts"]>,
            ReturnType<Connection["getSlot"]>,
          ]>
        >
      >
    | null = null;

  for (let attempt = 0; attempt <= rpcRetries; attempt += 1) {
    try {
      snapshot = await Promise.all([
        connection.getProgramAccounts(program, {
          commitment: COMMITMENT,
          filters: filters(
            PANTA_ORDER_NODE_SIZE,
            ORDER_NODE_DISCRIMINATOR_BASE58,
            PANTA_ORDER_NODE_EVENT_OFFSET,
            normalizedMarketId,
          ),
        }),
        connection.getProgramAccounts(program, {
          commitment: COMMITMENT,
          filters: filters(
            PANTA_PRICE_LEVEL_SIZE,
            PRICE_LEVEL_DISCRIMINATOR_BASE58,
            PANTA_PRICE_LEVEL_EVENT_OFFSET,
            normalizedMarketId,
          ),
        }),
        connection.getSlot(COMMITMENT),
      ]);
      break;
    } catch (error) {
      if (attempt >= rpcRetries) throw error;
      await new Promise((resolve) => setTimeout(resolve, 200 * 2 ** attempt));
    }
  }

  if (!snapshot) {
    throw new PantaOrderBookError("Unable to read Panta order book from Solana RPC");
  }
  const [orderAccounts, levelAccounts, slot] = snapshot;

  const levels = levelAccounts.map(({ pubkey, account }) => ({
    pubkey: pubkey.toBase58(),
    ...decodePriceLevel(Buffer.from(account.data)),
  }));
  const orders = orderAccounts.map(({ pubkey, account }) => ({
    pubkey: pubkey.toBase58(),
    ...decodeOrderNode(Buffer.from(account.data)),
  }));

  const activeOrders = orders.filter(
    (order) => order.event === normalizedMarketId && isLiveOrderNode(order),
  );
  const normalized = activeOrders.map((order) =>
    normalizeOrderNode(order, quoteAsset, shareDecimals),
  );
  const buy = sortExecutableOpportunities(
    normalized.filter((opportunity) => opportunity.action === "buy"),
  );
  const sell = sortExecutableOpportunities(
    normalized.filter((opportunity) => opportunity.action === "sell"),
  );
  const bestFor = (action: PantaTakerAction, outcome: PantaOutcome) =>
    (action === "buy" ? buy : sell).find((row) => row.outcome === outcome) ?? null;

  return {
    source: "solana-onchain",
    marketId: normalizedMarketId,
    programId: program.toBase58(),
    quoteAsset,
    slot,
    observedAt: new Date().toISOString(),
    counts: {
      priceLevelAccounts: levels.length,
      activePriceLevels: levels.filter(
        (level) => level.event === normalizedMarketId && isActivePriceLevel(level),
      ).length,
      orderNodeAccounts: orders.length,
      activeOrders: activeOrders.length,
      buyOpportunities: buy.length,
      sellOpportunities: sell.length,
    },
    best: {
      buy: { yes: bestFor("buy", "yes"), no: bestFor("buy", "no") },
      sell: { yes: bestFor("sell", "yes"), no: bestFor("sell", "no") },
    },
    opportunities: { buy, sell },
    limitations: [
      "The UI bucket is inferred as the inverse of maker order_intent: maker BUY becomes a taker Sell Opportunity; maker SELL becomes a taker Buy Opportunity.",
      "Closed accounts are absent from getProgramAccounts; retained nodes are excluded only when is_initialized is false, remaining amount is zero, or price is zero.",
      "Price-level and order-node RPC reads are confirmed but not an atomic snapshot, so a fill landing between calls can briefly make aggregate counts disagree.",
    ],
  };
}

