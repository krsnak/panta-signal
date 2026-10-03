import Link from "next/link";
import Image from "next/image";
import { getMarketTrades } from "@/lib/panta";
import { getMarketHistory } from "@/lib/history";
import { getCanonicalMarketSignal } from "@/lib/signal-service";
import {
  describeMarketSignal,
  formatSignalWindow,
} from "@/lib/signal-model";
import PrimaryBuyPanel from "@/components/PrimaryBuyPanel";
import WalletConnectButton from "@/components/WalletConnectButton";

type PageProps = {
  params: Promise<{ marketId: string }>;
  searchParams: Promise<{
    title?: string;
    description?: string;
    category?: string;
    phase?: string;
    status?: string;
    yes?: string;
    no?: string;
    volume?: string;
    image?: string;
  }>;
};

function pct(value: number | null) {
  if (value === null) return "—";
  if (value === 0 || value === 1) return `${value * 100}%`;
  return `${(value * 100).toFixed(1)}%`;
}

function formatDate(value: number | null) {
  if (!value) return "—";
  return new Date(value * 1000).toLocaleString("en-GB");
}

function historyPolyline(points: Array<{ yesProbability: number }>) {
  if (points.length < 2) return "";
  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 100 - point.yesProbability * 100;
      return `${x},${y}`;
    })
    .join(" ");
}

function parseNumber(value: string | undefined) {
  if (value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isValidSolanaSignature(value: string | null | undefined) {
  return Boolean(
    value &&
      value.length >= 80 &&
      value.length <= 90 &&
      /^[1-9A-HJ-NP-Za-km-z]+$/.test(value),
  );
}

export default async function MarketDetailPage({ params, searchParams }: PageProps) {
  const { marketId } = await params;
  const fallback = await searchParams;
  const decodedMarketId = decodeURIComponent(marketId);
  const signal = await getCanonicalMarketSignal(decodedMarketId).catch(() => null);
  const [trades, historyPoints] = await Promise.all([
    getMarketTrades(decodedMarketId, 20).catch(() => []),
    getMarketHistory(decodedMarketId, 24).catch(() => []),
  ]);
  const fallbackVolume = parseNumber(fallback.volume);
  const baseMarket = signal?.market ?? {
    id: decodedMarketId,
    title: fallback.title || `Market ${decodedMarketId.slice(0, 8)}…`,
    description: fallback.description || "",
    category: fallback.category || "other",
    phase: fallback.phase || "unknown",
    status: fallback.status || "unknown",
    yesProbability: null,
    noProbability: null,
    volumeUsdc: fallbackVolume || 0,
    imageUrl: fallback.image || null,
  };
  const resolvedMarket = {
    ...baseMarket,
    title:
      baseMarket.title.startsWith("Market ") && fallback.title
        ? fallback.title
        : baseMarket.title,
    description: baseMarket.description || fallback.description || "",
    category: baseMarket.category === "other" && fallback.category ? fallback.category : baseMarket.category,
    phase: baseMarket.phase === "unknown" && fallback.phase ? fallback.phase : baseMarket.phase,
    status: baseMarket.status === "unknown" && fallback.status ? fallback.status : baseMarket.status,
    yesProbability: signal?.current.yesProbability ?? baseMarket.yesProbability,
    noProbability: signal?.current.noProbability ?? baseMarket.noProbability,
    volumeUsdc:
      signal?.current.volumeUsdc ??
      (baseMarket.volumeUsdc || fallbackVolume || 0),
    imageUrl: baseMarket.imageUrl || fallback.image || null,
  };
  const quoteState = signal?.quoteState ?? "unavailable";
  const quoteAvailable =
    resolvedMarket.yesProbability !== null && resolvedMarket.noProbability !== null;
  const cachedObservedAt =
    quoteState === "cached" && signal?.current.observedAt
      ? new Date(signal.current.observedAt).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  return (
    <main className="min-h-screen bg-[#07110d] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="text-sm font-medium text-emerald-300 hover:text-emerald-200">← Markets</Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs uppercase tracking-[0.16em] text-white/25 sm:inline">Powered by Panta</span>
            <WalletConnectButton compact />
          </div>
        </div>

        <section className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1612] shadow-2xl shadow-black/25">
            <div className="relative aspect-[16/7.5] overflow-hidden bg-black/25">
              {resolvedMarket.imageUrl ? (
                <Image
                  src={resolvedMarket.imageUrl}
                  alt=""
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 65vw"
                />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(52,211,153,.18),transparent_45%)]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b1612] via-[#0b1612]/10 to-transparent" />
              <div className="absolute left-5 top-5 flex gap-2">
                <span className="rounded-full bg-black/55 px-3 py-1.5 text-xs text-white/75 backdrop-blur">{resolvedMarket.category}</span>
                <span className="rounded-full bg-black/55 px-3 py-1.5 text-xs uppercase text-white/60 backdrop-blur">{resolvedMarket.phase}</span>
              </div>
            </div>
            <div className="p-6 sm:p-8">
              <div className="text-xs uppercase tracking-[0.17em] text-white/30">{resolvedMarket.status}</div>
              <h1 className="mt-3 max-w-4xl text-3xl font-semibold leading-tight tracking-[-0.025em] md:text-5xl">{resolvedMarket.title}</h1>
              {resolvedMarket.description && <p className="mt-4 max-w-3xl text-base leading-7 text-white/45">{resolvedMarket.description}</p>}
              <div className="mt-7 flex flex-wrap items-center gap-5 text-sm text-white/35">
                <span><strong className="font-medium text-white/70">${resolvedMarket.volumeUsdc.toLocaleString()}</strong> volume</span>
                <span>Market ID <span className="font-mono text-white/45">{resolvedMarket.id.slice(0, 8)}…</span></span>
              </div>
            </div>
          </div>

          <aside className="rounded-[28px] border border-white/10 bg-[#0b1612] p-5 shadow-2xl shadow-black/25 lg:sticky lg:top-6 lg:self-start">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.18em] text-white/30">Current market</div>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                quoteState === "live"
                  ? "bg-emerald-300/10 text-emerald-200"
                  : quoteState === "cached"
                    ? "bg-amber-300/10 text-amber-200"
                    : quoteState === "resolved"
                      ? "bg-white/10 text-white/55"
                      : "bg-rose-300/10 text-rose-200"
              }`}>
                {quoteState === "cached" && cachedObservedAt
                  ? `Cached ${cachedObservedAt}`
                  : quoteState}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08] p-4">
                <div className="text-xs text-white/35">YES</div>
                <div className="mt-1 text-4xl font-semibold text-emerald-200">{pct(resolvedMarket.yesProbability)}</div>
              </div>
              <div className="rounded-2xl border border-rose-300/20 bg-rose-300/[0.07] p-4">
                <div className="text-xs text-white/35">NO</div>
                <div className="mt-1 text-4xl font-semibold text-rose-200">{pct(resolvedMarket.noProbability)}</div>
              </div>
            </div>
            {quoteState === "cached" && (
              <div className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] px-3 py-2.5 text-xs leading-5 text-amber-100/60">
                Live Panta RPC quote is unavailable. Showing the last successful observation captured at {cachedObservedAt}.
              </div>
            )}
            {!quoteAvailable && (
              <div className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] px-3 py-2.5 text-xs leading-5 text-amber-100/60">
                No usable live or recent cached quote is available. Market metadata remains live.
              </div>
            )}
            <div className="mt-5 border-t border-white/10 pt-5">
              <PrimaryBuyPanel marketId={resolvedMarket.id} enabled={resolvedMarket.phase === "primary"} />
            </div>
          </aside>
        </section>

        <section className="mt-5 rounded-3xl border border-cyan-300/10 bg-cyan-300/[0.025] p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/70">
            Evidence sources
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
              <div className="text-sm font-semibold text-white/80">Panta API</div>
              <div className="mt-1 text-xs leading-5 text-white/35">
                Market identity, current YES/NO quote, phase and volume.
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
              <div className="text-sm font-semibold text-white/80">Panta Signal</div>
              <div className="mt-1 text-xs leading-5 text-white/35">
                Durable observations, probability movement and signal interpretation.
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
              <div className="text-sm font-semibold text-white/80">Solana</div>
              <div className="mt-1 text-xs leading-5 text-white/35">
                Public transaction signatures make recent Panta activity independently auditable on-chain.
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.035] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm uppercase tracking-[0.18em] text-white/35">Signal Feed</div>
              <h2 className="mt-2 text-2xl font-semibold">Observed market signal</h2>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 uppercase text-white/50">
                {signal?.kind ?? "unavailable"}
              </span>
              <span className="text-white/30">
                {signal?.quoteState ?? "unavailable"}
                {signal?.current.freshnessState === "stale" ? " · stale" : ""}
              </span>
            </div>
          </div>

          <p className="mt-4 max-w-4xl leading-7 text-white/60">
            {signal
              ? describeMarketSignal(signal)
              : "A canonical Panta Signal could not be built for this market right now."}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
              <div className="text-[10px] uppercase tracking-[0.14em] text-white/30">Price movement</div>
              <div className="mt-2 text-2xl font-semibold">
                {signal?.movement.changePoints === null || signal?.movement.changePoints === undefined
                  ? "Collecting"
                  : `${signal.movement.changePoints >= 0 ? "+" : ""}${signal.movement.changePoints.toFixed(1)} pts`}
              </div>
              <div className="mt-1 text-xs text-white/30">
                {signal
                  ? `${signal.movement.observationCount} obs · ${formatSignalWindow(signal.movement.windowSeconds)}`
                  : "history unavailable"}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
              <div className="text-[10px] uppercase tracking-[0.14em] text-white/30">24h trades</div>
              <div className="mt-2 text-2xl font-semibold">
                {signal?.activity24h?.tradeCount24h ?? "—"}
              </div>
              <div className="mt-1 text-xs text-white/30">
                {signal?.activityState === "unavailable"
                  ? "trade tape unavailable"
                  : `${signal?.activity24h?.primaryCount24h ?? 0} primary · last trade ${signal?.activity24h?.latestTradeAgeSeconds === null || signal?.activity24h?.latestTradeAgeSeconds === undefined ? "unknown" : signal.activity24h.latestTradeAgeSeconds < 3600 ? `${Math.max(1, Math.round(signal.activity24h.latestTradeAgeSeconds / 60))}m ago` : `${(signal.activity24h.latestTradeAgeSeconds / 3600).toFixed(1)}h ago`}`}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
              <div className="text-[10px] uppercase tracking-[0.14em] text-white/30">24h shares</div>
              <div className="mt-2 text-lg font-semibold text-emerald-200">
                YES {signal?.activity24h ? signal.activity24h.yesShares24h.toFixed(2) : "—"}
              </div>
              <div className="mt-1 text-sm font-medium text-rose-200">
                NO {signal?.activity24h ? signal.activity24h.noShares24h.toFixed(2) : "—"}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
              <div className="text-[10px] uppercase tracking-[0.14em] text-white/30">Market volume</div>
              <div className="mt-2 text-2xl font-semibold">
                ${resolvedMarket.volumeUsdc.toFixed(2)}
              </div>
              <div className="mt-1 text-xs text-white/30">Panta market detail</div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/15 p-4">
            {historyPoints.length < 2 ? (
              <div className="flex h-44 items-center justify-center text-sm text-white/35">
                Waiting for another snapshot before drawing the 24h probability line.
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between text-xs text-white/35">
                  <span>YES probability</span>
                  <span>
                    {Math.round(historyPoints[0].yesProbability * 100)}% → {Math.round(historyPoints[historyPoints.length - 1].yesProbability * 100)}%
                  </span>
                </div>
                <svg viewBox="0 0 100 100" className="h-44 w-full" preserveAspectRatio="none" role="img" aria-label="24 hour YES probability history">
                  <line x1="0" y1="25" x2="100" y2="25" stroke="currentColor" strokeOpacity="0.08" vectorEffect="non-scaling-stroke" />
                  <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeOpacity="0.08" vectorEffect="non-scaling-stroke" />
                  <line x1="0" y1="75" x2="100" y2="75" stroke="currentColor" strokeOpacity="0.08" vectorEffect="non-scaling-stroke" />
                  <polyline
                    points={historyPolyline(historyPoints)}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-emerald-300"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </>
            )}
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.035] p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-sm uppercase tracking-[0.18em] text-white/35">Activity</div>
              <h2 className="mt-2 text-2xl font-semibold">Recent trades</h2>
            </div>
            <span className="text-sm text-white/35">{trades.length} rows</span>
          </div>

          <div className="mt-5 space-y-3">
            {trades.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-black/15 p-5 text-sm text-white/45">No trades available for this market yet.</div>
            ) : trades.map((trade) => (
              <div key={trade.id || trade.signature} className="grid gap-3 rounded-xl border border-white/10 bg-black/15 p-4 text-sm md:grid-cols-[1fr_auto_auto_auto] md:items-center">
                <div className="min-w-0">
                  <div className="truncate text-white/70">{trade.wallet}</div>
                  <div className="mt-1 text-xs text-white/35">{formatDate(trade.blockTime)} · {trade.isPrimary ? "Primary" : "Secondary"}</div>
                </div>
                <div className="text-white/60">YES {trade.yesAmount} · NO {trade.noAmount}</div>
                <div className="text-right text-white/35">fee {trade.feePaid} {trade.quoteAsset}</div>
                {isValidSolanaSignature(trade.signature) ? (
                  <a
                    href={`https://explorer.solana.com/tx/${trade.signature}`}
                    target="_blank"
                    rel="noreferrer"
                    className="justify-self-start rounded-lg border border-cyan-300/15 bg-cyan-300/[0.05] px-3 py-2 text-xs font-medium text-cyan-100/80 transition hover:bg-cyan-300/10 md:justify-self-end"
                  >
                    Explorer ↗
                  </a>
                ) : (
                  <span className="text-xs text-white/20 md:text-right">No signature</span>
                )}
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-10 border-t border-white/10 pt-6 text-sm text-white/40">Powered by Panta</footer>
      </div>
    </main>
  );
}
