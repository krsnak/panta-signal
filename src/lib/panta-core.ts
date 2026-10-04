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
  quoteAsset?: string | null;
  startTime?: string | null;
  endTime?: string | null;
};

export type CatalogMarket = {
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

const CLOSED_MARKET_STATUSES = new Set([
  "cancelled",
  "canceled",
  "resolved",
  "closed",
  "deleted",
]);

export function isClosedMarketStatus(status: string | null | undefined) {
  return CLOSED_MARKET_STATUSES.has(status?.trim().toLowerCase() || "");
}

export function isTradingPhase(phase: string | null | undefined) {
  const value = phase?.trim().toLowerCase();
  return value === "primary" || value === "secondary";
}

export function hasValidProbabilityPair(
  yes: number | null | undefined,
  no: number | null | undefined,
  tolerance = 0.02,
) {
  if (yes === null || yes === undefined || no === null || no === undefined) return false;
  if (!Number.isFinite(yes) || !Number.isFinite(no)) return false;
  if (yes < 0 || yes > 1 || no < 0 || no > 1) return false;
  return Math.abs(yes + no - 1) <= tolerance;
}

export function isRelevantMarket(market: PantaMarket) {
  const title = market.title.trim();
  if (!title || title.startsWith("Market ") || title.startsWith("Panta market ")) return false;
  if (isClosedMarketStatus(market.status)) return false;
  if (!isTradingPhase(market.phase)) return false;
  return true;
}

export function sanitizeProbabilityPair(market: PantaMarket): PantaMarket {
  if (market.yesProbability === null && market.noProbability === null) return market;
  if (hasValidProbabilityPair(market.yesProbability, market.noProbability)) return market;
  return {
    ...market,
    yesProbability: null,
    noProbability: null,
  };
}

export function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function fromSixDecimalBaseUnits(
  value: string | number | null | undefined,
) {
  const parsed = toNumber(value);
  return parsed === null ? null : parsed / 1_000_000;
}

export function normalizeStatus(value: string | undefined, phase: string | undefined) {
  const raw = value?.trim() || "";
  if (raw === "secondary_active") return "secondary";
  if (raw) return raw;
  return phase?.trim() || "unknown";
}

export function hasUsefulDetail(row: CatalogMarket) {
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

export function normalizeMarket(row: CatalogMarket, fallback?: CatalogMarket): PantaMarket {
  const yes =
    toNumber(row.yesPrice) ??
    toNumber(row.primaryYesPrice) ??
    toNumber(row.secondaryYesPrice);
  const no =
    toNumber(row.noPrice) ??
    toNumber(row.primaryNoPrice) ??
    toNumber(row.secondaryNoPrice);

  return sanitizeProbabilityPair({
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
  });
}

export function errorMessageFromBody(body: unknown) {
  if (!body || typeof body !== "object") return "";
  const value = body as {
    message?: unknown;
    detail?: unknown;
    field?: unknown;
    fields?: unknown;
  };
  if (typeof value.message === "string" && value.message.trim()) return value.message.trim();
  if (typeof value.detail === "string" && value.detail.trim()) return value.detail.trim();
  if (typeof value.field === "string" && value.field.trim()) return value.field.trim();
  if (value.fields && typeof value.fields === "object") {
    try {
      return JSON.stringify(value.fields);
    } catch {
      return "";
    }
  }
  return "";
}
