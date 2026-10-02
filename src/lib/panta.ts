import "server-only";
import { PublicKey } from "@solana/web3.js";
import {
  errorMessageFromBody,
  fromSixDecimalBaseUnits,
  hasUsefulDetail,
  normalizeMarket,
  toNumber,
  type CatalogMarket,
  type PantaMarket,
} from "@/lib/panta-core";

export type { PantaMarket } from "@/lib/panta-core";

export type MarketSnapshot = {
  source: "panta" | "sample";
  markets: PantaMarket[];
  categories: string[];
  error: string | null;
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
const PUBLIC_REGISTRY_URL = "https://production-api.balr.fun/api/v1/events";

type PublicRegistryEvent = {
  eventPda?: string;
  status?: string;
  Category?: string;
  title?: string | null;
  description?: string | null;
  images?: string[];
  endTime?: string;
  isResolved?: boolean;
  isDeleted?: boolean;
};

type PublicRegistryResponse = {
  success?: boolean;
  data?: PublicRegistryEvent[];
};

type PantaFetchOptions = {
  timeoutMs?: number;
  retries?: number;
  revalidate?: number;
  noStore?: boolean;
};

class PantaApiError extends Error {
  status: number;
  code: string | null;

  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.name = "PantaApiError";
    this.status = status;
    this.code = code;
  }
}

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

async function pantaFetch<T>(path: string, options: PantaFetchOptions = {}): Promise<T> {
  const { apiKey, baseUrl } = getConfig();
  if (!apiKey) throw new Error("Missing PANTA_API_KEY");
  const timeoutMs = options.timeoutMs ?? 5000;
  const retries = Math.max(0, options.retries ?? 0);
  const url = new URL(path.replace(/^\//, ""), baseUrl);

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "X-Api-Key": apiKey,
        },
        ...(options.noStore
          ? { cache: "no-store" as const }
          : options.revalidate !== undefined
            ? { next: { revalidate: options.revalidate } }
            : { cache: "no-store" as const }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (response.ok) return (await response.json()) as T;

      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        // Cloudflare / proxy failures may return HTML.
      }
      const parsed = body as { code?: unknown } | null;
      const code = typeof parsed?.code === "string" ? parsed.code : null;
      const detail = errorMessageFromBody(body);
      const retryable = response.status === 429 || response.status >= 500;

      if (retryable && attempt < retries) {
        const retryAfter = Number(response.headers.get("retry-after"));
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, Math.min(waitMs, 2000)));
        continue;
      }

      throw new PantaApiError(
        `Panta API ${response.status}${code ? `: ${code}` : ""}${detail ? ` — ${detail}` : ""}`,
        response.status,
        code,
      );
    } catch (error) {
      if (error instanceof PantaApiError) throw error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
        continue;
      }
      if (error instanceof DOMException && error.name === "TimeoutError") {
        throw new Error(`Panta API timeout after ${timeoutMs} ms`);
      }
      throw error;
    }
  }

  throw new Error("Panta API request failed");
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
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    let code = "";
    let detail = "";
    try {
      const parsed = (await response.json()) as unknown;
      code = parsed && typeof parsed === "object" && typeof (parsed as { code?: unknown }).code === "string"
        ? (parsed as { code: string }).code
        : "";
      detail = errorMessageFromBody(parsed);
    } catch {
      // Keep status-only error.
    }
    const suffix = [code, detail].filter(Boolean).join(" — ");
    throw new Error(`Panta API ${response.status}${suffix ? `: ${suffix}` : ""}`);
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

export type MarketCreateQuote = {
  createId: string;
  expectedEventPda: string;
  paymentUsdc: string;
  liquidityInjectionUsdc: string;
  platformRevenueUsdc: string;
  marketType: string;
  expiresAt: string;
  blockhashExpiryHintSec?: number;
};

export type MarketCreateBuild = MarketCreateQuote & {
  transaction: string;
  recentBlockhash: string;
  lastValidBlockHeight: number;
  buildFingerprint: string;
  derived?: Record<string, string>;
};

export type MarketCreateRegistration = {
  createId: string;
  marketId: string;
  status: string;
  signature: string;
  category?: string;
  title?: string;
  images?: string[];
};

export type PantaAccountStatus = {
  status: string;
  canCreateMarkets: boolean;
  keyEnvironment: "live" | "test" | "unknown";
};

export async function getPantaAccountStatus(): Promise<PantaAccountStatus> {
  const account = await pantaFetch<{
    status?: string;
    canCreateMarkets?: boolean;
    apiKeyId?: string;
  }>("account/", {
    timeoutMs: 3000,
    retries: 1,
    noStore: true,
  });
  const apiKey = getConfig().apiKey || "";
  return {
    status: account.status?.trim() || "unknown",
    canCreateMarkets: account.canCreateMarkets === true,
    keyEnvironment: apiKey.startsWith("pk_live_")
      ? "live"
      : apiKey.startsWith("pk_test_")
        ? "test"
        : "unknown",
  };
}

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

export async function quoteMarketCreate(input: {
  wallet: string;
  question: string;
  resolutionRule: string;
  sourcesOfTruth: string[];
  category: string;
  startTime: number;
  endTime: number;
  resolutionTime: number;
  imageUrl: string;
  marketType?: "standard" | "breaking";
  eventInProgress?: boolean;
  title?: string;
  description?: string;
  region?: string;
  oracle?: string;
}) {
  return pantaPost<MarketCreateQuote>("markets/create/quote/", input);
}

export async function buildMarketCreate(input: { createId: string; wallet?: string }) {
  return pantaPost<MarketCreateBuild>("markets/create/build/", input);
}

export async function registerMarketCreate(input: { createId: string; signature: string }) {
  return pantaPost<MarketCreateRegistration>("markets/register/", input);
}

async function getCategories() {
  const result = await pantaFetch<CategoriesResponse>("categories/", {
    timeoutMs: 2500,
    retries: 1,
    revalidate: 300,
  });
  return Array.isArray(result.categories) ? result.categories : [];
}

async function getCatalogRows(options?: {
  category?: string;
  status?: string;
  maxItems?: number;
}) {
  const maxItems = Math.min(Math.max(options?.maxItems ?? 200, 1), 250);
  const rows: CatalogMarket[] = [];
  let cursor: string | null = null;

  while (rows.length < maxItems) {
    const params = new URLSearchParams({
      limit: String(Math.min(50, maxItems - rows.length)),
    });
    if (options?.category) params.set("category", options.category);
    if (options?.status) params.set("status", options.status);
    if (cursor) params.set("cursor", cursor);

    const page = await pantaFetch<MarketListResponse>(
      `markets/?${params.toString()}`,
      {
        timeoutMs: 3000,
        retries: 1,
        revalidate: 30,
      },
    );

    const items = page.items ?? [];
    rows.push(...items);
    cursor = page.nextCursor?.trim() || null;
    if (!cursor || items.length === 0) break;
  }

  return rows.slice(0, maxItems);
}

async function findCatalogMarket(marketId: string) {
  let cursor: string | null = null;
  for (let pageIndex = 0; pageIndex < 5; pageIndex += 1) {
    const params = new URLSearchParams({ limit: "50" });
    if (cursor) params.set("cursor", cursor);
    const page = await pantaFetch<MarketListResponse>(
      `markets/?${params.toString()}`,
      {
        timeoutMs: 2500,
        retries: 1,
        revalidate: 30,
      },
    );
    const match = (page.items ?? []).find((market) => market.marketId === marketId);
    if (match) return match;
    cursor = page.nextCursor?.trim() || null;
    if (!cursor) break;
  }
  return null;
}

export async function getMarketDetail(marketId: string): Promise<PantaMarket> {
  try {
    const detail = await pantaFetch<CatalogMarket>(
      `markets/${encodeURIComponent(marketId)}/`,
      { timeoutMs: 3500, retries: 1, revalidate: 10 },
    );
    if (hasUsefulDetail(detail)) return normalizeMarket(detail);
  } catch {
    // Fall through to the catalog row, which remains useful even if live RPC is unavailable.
  }

  const fallback = await findCatalogMarket(marketId);
  if (!fallback) throw new Error("Panta market metadata is temporarily unavailable");
  return normalizeMarket(fallback, fallback);
}

export async function getFullMarketCatalog(options?: {
  category?: string;
  status?: string;
  maxItems?: number;
}): Promise<PantaMarket[]> {
  const rows = await getCatalogRows(options);
  return rows
    .filter((market) => Boolean(market.title?.trim()))
    .map((market) => normalizeMarket(market, market));
}

export async function getCurrentPublicRegistryMarkets(limit = 20): Promise<PantaMarket[]> {
  const response = await fetch(PUBLIC_REGISTRY_URL, {
    headers: { Accept: "application/json" },
    next: { revalidate: 30 },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Panta registry ${response.status}`);

  const body = (await response.json()) as PublicRegistryResponse;
  const now = Date.now();
  const activeStatuses = new Set([
    "open",
    "premarket_closed",
    "in_progress",
    "ended",
    "primary_closed",
    "secondary_active",
  ]);

  const registryRows = (body.data ?? [])
    .filter((event) => {
      const endAt = event.endTime ? Date.parse(event.endTime) : Number.POSITIVE_INFINITY;
      return (
        Boolean(event.eventPda?.trim()) &&
        !event.isDeleted &&
        !event.isResolved &&
        activeStatuses.has(event.status?.trim() || "") &&
        (!Number.isFinite(endAt) || endAt > now)
      );
    })
    .slice(0, Math.min(Math.max(limit, 1), 30));

  const isTestEnvironment = getConfig().apiKey?.startsWith("pk_test_") === true;

  const hydrateEvent = async (event: PublicRegistryEvent) => {
      const id = event.eventPda!.trim();
      if (!isTestEnvironment) {
        try {
          const detail = await getMarketDetail(id);
          return {
            ...detail,
            description: detail.description || event.description?.trim() || "",
            category: event.Category?.trim() || detail.category,
            imageUrl: detail.imageUrl || event.images?.[0] || null,
          } satisfies PantaMarket;
        } catch {
          // Fall back to public registry metadata below.
        }
      }
      {
        const phase =
          event.status === "secondary_active"
            ? "secondary"
            : event.status === "open" || event.status === "in_progress"
              ? "primary"
              : event.status || "unknown";
        return {
          id,
          title:
            event.title?.trim() ||
            event.description?.trim() ||
            `Panta market ${id.slice(0, 8)}…`,
          description: event.description?.trim() || "",
          category: event.Category?.trim() || "other",
          phase,
          status: event.status?.trim() || phase,
          yesProbability: null,
          noProbability: null,
          volumeUsdc: 0,
          imageUrl: event.images?.[0] ?? null,
        } satisfies PantaMarket;
      }
  };

  const hydrated: PantaMarket[] = [];
  for (let index = 0; index < registryRows.length; index += 3) {
    const batch = registryRows.slice(index, index + 3);
    hydrated.push(...(await Promise.all(batch.map(hydrateEvent))));
  }
  return hydrated;
}

export async function getMarketTrades(marketId: string, limit = 50): Promise<PantaTrade[]> {
  const result = await pantaFetch<MarketTradesResponse>(
    `markets/${encodeURIComponent(marketId)}/trades/?limit=${Math.min(Math.max(limit, 1), 200)}`,
    { timeoutMs: 3500, retries: 1, revalidate: 5 },
  );
  return (result.items ?? []).map((trade) => ({
    id: String(trade.id ?? ""),
    wallet: trade.wallet ?? "",
    isPrimary: Boolean(trade.isPrimary),
    yesAmount: fromSixDecimalBaseUnits(trade.yesAmount) ?? 0,
    noAmount: fromSixDecimalBaseUnits(trade.noAmount) ?? 0,
    feePaid: fromSixDecimalBaseUnits(trade.feePaid) ?? 0,
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
  const path = `positions/?wallet=${encodeURIComponent(trimmed)}`;
  let result: PositionsResponse;
  try {
    result = await pantaFetch<PositionsResponse>(path, {
      timeoutMs: 7000,
      retries: 1,
      noStore: true,
    });
  } catch (error) {
    if (
      error instanceof PantaApiError &&
      error.status === 400 &&
      error.code === "INVALID_MARKET_PARAMS"
    ) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      try {
        result = await pantaFetch<PositionsResponse>(path, {
          timeoutMs: 7000,
          retries: 0,
          noStore: true,
        });
      } catch (retryError) {
        if (
          retryError instanceof PantaApiError &&
          retryError.status === 400 &&
          retryError.code === "INVALID_MARKET_PARAMS"
        ) {
          throw new Error(
            "Panta positions are temporarily unavailable. Please retry in a moment.",
          );
        }
        throw retryError;
      }
    } else {
      throw error;
    }
  }
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
    const catalogRows = await getCatalogRows({
      category,
      status,
      // Public catalog pages can contain incomplete rows. Read a few cheap
      // registry pages so search/discovery is not limited to the first 50.
      maxItems: 150,
    });
    const categories = await getCategories().catch(() =>
      Array.from(
        new Set(
          catalogRows
            .map((market) => market.category?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ),
    );

    const selected = catalogRows
      .filter((market) => Boolean(market.title?.trim()))
      .filter((market) => {
        if (!query) return true;
        const haystack = `${market.title ?? ""} ${market.description ?? ""} ${market.category ?? ""}`.toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, limit);

    return {
      source: "panta",
      // Catalog-first by design. Live spot prices are hydrated independently
      // so an RPC slowdown cannot delay the entire homepage.
      markets: selected.map((market) => normalizeMarket(market, market)),
      categories,
      error: null,
    };
  } catch (error) {
    return buildSampleSnapshot(error instanceof Error ? error.message : "Unknown Panta API error");
  }
}
