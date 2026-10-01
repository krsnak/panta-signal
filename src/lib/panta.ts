import "server-only";
import { PublicKey } from "@solana/web3.js";

export type PantaMarket = {
  id: string;
  title: string;
  description: string;
  category: string;
  phase: string;
  status: string;
  yesProbability: number | null;
  noProbability: number | null;
  volumeUsdc: number;
  imageUrl: string | null;
};

export type MarketSnapshot = {
  source: "panta" | "sample";
  markets: PantaMarket[];
  categories: string[];
  error: string | null;
};

type CatalogMarket = {
  marketId: string;
  category?: string;
  title?: string;
  description?: string;
  images?: string[];
  phase?: string;
  status?: string;
  volumeUsdc?: string;
  yesPrice?: string | null;
  noPrice?: string | null;
  primaryYesPrice?: string | null;
  primaryNoPrice?: string | null;
  secondaryYesPrice?: string | null;
  secondaryNoPrice?: string | null;
};

type MarketListResponse = {
  items?: CatalogMarket[];
  nextCursor?: string | null;
};

type CategoriesResponse = {
  categories?: string[];
};

export type PantaTrade = {
  id: string;
  wallet: string;
  isPrimary: boolean;
  yesAmount: number;
  noAmount: number;
  feePaid: number;
  blockTime: number | null;
  signature: string;
  quoteAsset: string;
};

export type PantaPosition = {
  marketId: string;
  category: string | null;
  side: string;
  shares: number;
  phase: string;
  claimable: boolean;
  claimed: boolean;
  outcome: string | null;
};

type MarketTradesResponse = {
  items?: Array<{
    id?: string | number;
    wallet?: string;
    isPrimary?: boolean;
    yesAmount?: string | number;
    noAmount?: string | number;
    feePaid?: string | number;
    blockTime?: number | null;
    signature?: string;
    quoteAsset?: string;
  }>;
};

type PositionsResponse = {
  positions?: Array<{
    marketId?: string;
    category?: string | null;
    side?: string;
    shares?: string;
    phase?: string;
    claimable?: boolean;
    claimed?: boolean;
    outcome?: string | null;
  }>;
};

const DEFAULT_BASE_URL = "https://live-api.panta.market/api/v1/";

const sampleMarkets: PantaMarket[] = [
  {
    id: "btc-150k",
    title: "Will Bitcoin trade above $150k before 2027?",
    description: "Sample market shown until a Panta API key is configured.",
    category: "crypto",
    phase: "primary",
    status: "sample",
    yesProbability: 0.57,
    noProbability: 0.43,
    volumeUsdc: 184320,
    imageUrl: null,
  },
  {
    id: "sol-300",
    title: "Will SOL trade above $300 this year?",
    description: "Sample market shown until a Panta API key is configured.",
    category: "crypto",
    phase: "primary",
    status: "sample",
    yesProbability: 0.42,
    noProbability: 0.58,
    volumeUsdc: 93640,
    imageUrl: null,
  },
];

function buildSampleSnapshot(error: string | null = null): MarketSnapshot {
  return {
    source: "sample",
    markets: sampleMarkets,
    categories: ["crypto"],
    error,
  };
}

function getConfig() {
  return {
    apiKey: process.env.PANTA_API_KEY?.trim(),
    baseUrl: process.env.PANTA_API_BASE_URL?.trim() || DEFAULT_BASE_URL,
  };
}

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeStatus(value: string | undefined, phase: string | undefined) {
  const raw = value?.trim() || "";
  if (raw === "secondary_active") return "secondary";
  if (raw) return raw;
  return phase?.trim() || "unknown";
}

function hasUsefulDetail(row: CatalogMarket) {
  const hasText = Boolean(row.title?.trim() || row.description?.trim());
  const hasPrice =
    toNumber(row.yesPrice) !== null ||
    toNumber(row.noPrice) !== null ||
    toNumber(row.primaryYesPrice) !== null ||
    toNumber(row.primaryNoPrice) !== null ||
    toNumber(row.secondaryYesPrice) !== null ||
    toNumber(row.secondaryNoPrice) !== null;
  const hasVolume = (toNumber(row.volumeUsdc) ?? 0) > 0;
  return hasText && (hasPrice || hasVolume);
}

async function fetchMarketDetailWithRetry(market: CatalogMarket, attempts = 3) {
  let last = market;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const detail = await pantaFetch<CatalogMarket>(
        `markets/${encodeURIComponent(market.marketId)}/`,
      );
      last = detail;
      if (hasUsefulDetail(detail)) return detail;
    } catch {
      // Retry briefly; catalog data remains the final fallback.
    }
    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
    }
  }
  return last;
}

function normalizeMarket(row: CatalogMarket, fallback?: CatalogMarket): PantaMarket {
  const yes =
    toNumber(row.yesPrice) ??
    toNumber(row.primaryYesPrice) ??
    toNumber(row.secondaryYesPrice);
  const no =
    toNumber(row.noPrice) ??
    toNumber(row.primaryNoPrice) ??
    toNumber(row.secondaryNoPrice);

  return {
    id: row.marketId,
    title:
      row.title?.trim() ||
      fallback?.title?.trim() ||
      row.description?.trim() ||
      fallback?.description?.trim() ||
      `Market ${row.marketId.slice(0, 8)}…`,
    description: row.description?.trim() || fallback?.description?.trim() || "",
    category: row.category?.trim() || fallback?.category?.trim() || "other",
    phase: row.phase?.trim() || fallback?.phase?.trim() || "unknown",
    status: normalizeStatus(row.status ?? fallback?.status, row.phase ?? fallback?.phase),
    yesProbability: yes,
    noProbability: no,
    volumeUsdc: toNumber(row.volumeUsdc) ?? toNumber(fallback?.volumeUsdc) ?? 0,
    imageUrl: row.images?.[0] ?? fallback?.images?.[0] ?? null,
  };
}

async function pantaFetch<T>(path: string): Promise<T> {
  const { apiKey, baseUrl } = getConfig();
  if (!apiKey) throw new Error("Missing PANTA_API_KEY");

  const response = await fetch(new URL(path.replace(/^\//, ""), baseUrl), {
    headers: {
      Accept: "application/json",
      "X-Api-Key": apiKey,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { code?: string; detail?: string };
      detail = body.code || body.detail || "";
    } catch {
      // Keep status-only error.
    }
    throw new Error(`Panta API ${response.status}${detail ? `: ${detail}` : ""}`);
  }

  return (await response.json()) as T;
}

async function pantaPost<T>(path: string, body: unknown): Promise<T> {
  const { apiKey, baseUrl } = getConfig();
  if (!apiKey) throw new Error("Missing PANTA_API_KEY");

  const response = await fetch(new URL(path.replace(/^\//, ""), baseUrl), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = "";
    try {
      const parsed = (await response.json()) as { code?: string; detail?: string };
      detail = parsed.code || parsed.detail || "";
    } catch {
      // Keep status-only error.
    }
    throw new Error(`Panta API ${response.status}${detail ? `: ${detail}` : ""}`);
  }

  return (await response.json()) as T;
}

export type PrimaryOrderQuote = {
  quoteId: string;
  marketId: string;
  side: string;
  amountUsdc: string;
  shares: string;
  avgPrice: string;
  feeUsdc: string;
  expiresAt: string;
  blockhashExpiryHintSec?: number;
};

export type PrimaryOrderBuild = {
  orderId: string;
  quoteId: string;
  wallet: string;
  marketId: string;
  side: string;
  amountUsdc: string;
  expectedShares: string;
  feeUsdc: string;
  status: string;
  instructions: Array<{
    programId: string;
    data: string;
    accounts: Array<{
      pubkey: string;
      isSigner: boolean;
      isWritable: boolean;
    }>;
  }>;
  recentBlockhash: string;
  lastValidBlockHeight?: number;
  expiresAt?: string;
  blockhashExpiryHintSec?: number;
};

export type PrimaryOrderStatus = {
  orderId: string;
  status: "built" | "submitted" | "confirmed" | "failed" | "expired" | string;
  signature?: string;
  marketId?: string;
  side?: string;
  amountUsdc?: number | string;
};

export async function quotePrimaryBuy(input: {
  wallet: string;
  marketId: string;
  side: "yes" | "no";
  amountUsdc: string;
}) {
  return pantaPost<PrimaryOrderQuote>("primaryorderquote/", input);
}

export async function buildPrimaryBuy(input: {
  quoteId: string;
  wallet: string;
  maxSlippageBps?: number;
}) {
  return pantaPost<PrimaryOrderBuild>("primaryorderbuild/", {
    ...input,
    maxSlippageBps: input.maxSlippageBps ?? 100,
  });
}

export async function submitPrimaryBuy(input: {
  orderId: string;
  signature: string;
  wallet?: string;
}) {
  return pantaPost<PrimaryOrderStatus>("primaryordersubmit/", input);
}

export async function verifyPrimaryBuy(input: {
  orderId: string;
  signature?: string;
  wallet?: string;
}) {
  return pantaPost<PrimaryOrderStatus>("primaryorderverify/", input);
}

async function getCategories() {
  const result = await pantaFetch<CategoriesResponse>("categories/");
  return Array.isArray(result.categories) ? result.categories : [];
}

export async function getMarketDetail(marketId: string): Promise<PantaMarket> {
  const detail = await pantaFetch<CatalogMarket>(`markets/${encodeURIComponent(marketId)}/`);

  if (hasUsefulDetail(detail)) {
    return normalizeMarket(detail);
  }

  const catalog = await pantaFetch<MarketListResponse>("markets/?limit=50");
  const fallback = (catalog.items ?? []).find((market) => market.marketId === marketId);
  return normalizeMarket(detail, fallback);
}

export async function getMarketTrades(marketId: string, limit = 50): Promise<PantaTrade[]> {
  const result = await pantaFetch<MarketTradesResponse>(
    `markets/${encodeURIComponent(marketId)}/trades/?limit=${Math.min(Math.max(limit, 1), 200)}`,
  );
  return (result.items ?? []).map((trade) => ({
    id: String(trade.id ?? ""),
    wallet: trade.wallet ?? "",
    isPrimary: Boolean(trade.isPrimary),
    yesAmount: toNumber(trade.yesAmount) ?? 0,
    noAmount: toNumber(trade.noAmount) ?? 0,
    feePaid: toNumber(trade.feePaid) ?? 0,
    blockTime: toNumber(trade.blockTime),
    signature: trade.signature ?? "",
    quoteAsset: trade.quoteAsset ?? "USDC",
  }));
}

export async function getWalletPositions(wallet: string): Promise<PantaPosition[]> {
  const trimmed = wallet.trim();
  try {
    new PublicKey(trimmed);
  } catch {
    throw new Error("Invalid Solana wallet address");
  }
  const result = await pantaFetch<PositionsResponse>(
    `positions/?wallet=${encodeURIComponent(trimmed)}`,
  );
  return (result.positions ?? []).map((position) => ({
    marketId: position.marketId ?? "",
    category: position.category ?? null,
    side: position.side ?? "unknown",
    shares: toNumber(position.shares) ?? 0,
    phase: position.phase ?? "unknown",
    claimable: Boolean(position.claimable),
    claimed: Boolean(position.claimed),
    outcome: position.outcome ?? null,
  }));
}

export async function getMarketSnapshot(options?: {
  query?: string;
  category?: string;
  status?: string;
  limit?: number;
}): Promise<MarketSnapshot> {
  const { apiKey } = getConfig();
  if (!apiKey) return buildSampleSnapshot("Missing PANTA_API_KEY");

  const query = options?.query?.trim().toLowerCase() || "";
  const category = options?.category?.trim();
  const status = options?.status?.trim();
  const limit = Math.min(Math.max(options?.limit ?? 12, 1), 20);

  try {
    const params = new URLSearchParams({ limit: "50" });
    if (category) params.set("category", category);
    if (status) params.set("status", status);

    const [catalog, categories] = await Promise.all([
      pantaFetch<MarketListResponse>(`markets/?${params.toString()}`),
      getCategories(),
    ]);

    const selected = (catalog.items ?? [])
      .filter((market) => {
        if (!query) return true;
        const haystack = `${market.title ?? ""} ${market.description ?? ""} ${market.category ?? ""}`.toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, limit);

    const detailed: Array<{ detail: CatalogMarket; fallback: CatalogMarket }> = [];
    const batchSize = 3;
    for (let start = 0; start < selected.length; start += batchSize) {
      const batch = selected.slice(start, start + batchSize);
      const results = await Promise.all(
        batch.map(async (market) => ({
          detail: await fetchMarketDetailWithRetry(market),
          fallback: market,
        })),
      );
      detailed.push(...results);
    }

    return {
      source: "panta",
      markets: detailed.map(({ detail, fallback }) => normalizeMarket(detail, fallback)),
      categories,
      error: null,
    };
  } catch (error) {
    return buildSampleSnapshot(error instanceof Error ? error.message : "Unknown Panta API error");
  }
}
