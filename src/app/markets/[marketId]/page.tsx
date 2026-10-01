import Link from "next/link";
import Image from "next/image";
import { getMarketDetail, getMarketTrades } from "@/lib/panta";
import { getMarketInsight, recordMarketSnapshots } from "@/lib/history";
import PrimaryBuyPanel from "@/components/PrimaryBuyPanel";

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
  return value === null ? "—" : `${Math.round(value * 100)}%`;
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

export default async function MarketDetailPage({ params, searchParams }: PageProps) {
  const { marketId } = await params;
  const fallback = await searchParams;
  const decodedMarketId = decodeURIComponent(marketId);
  const [market, trades] = await Promise.all([
    getMarketDetail(decodedMarketId),
    getMarketTrades(decodedMarketId, 50).catch(() => []),
  ]);
  const fallbackYes = parseNumber(fallback.yes);
  const fallbackNo = parseNumber(fallback.no);
  const fallbackVolume = parseNumber(fallback.volume);
  const resolvedMarket = {
    ...market,
    title:
      market.title.startsWith("Market ") && fallback.title
        ? fallback.title
        : market.title,
    description: market.description || fallback.description || "",
    category: market.category === "other" && fallback.category ? fallback.category : market.category,
    phase: market.phase === "unknown" && fallback.phase ? fallback.phase : market.phase,
    status: market.status === "unknown" && fallback.status ? fallback.status : market.status,
    yesProbability: market.yesProbability ?? fallbackYes,
    noProbability: market.noProbability ?? fallbackNo,
    volumeUsdc: market.volumeUsdc || fallbackVolume || 0,
    imageUrl: market.imageUrl || fallback.image || null,
  };
  await recordMarketSnapshots([resolvedMarket]);
  const insight = await getMarketInsight(resolvedMarket);
  const quoteAvailable =
    resolvedMarket.yesProbability !== null && resolvedMarket.noProbability !== null;

  return (
    <main className="min-h-screen bg-[#07110d] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm font-medium text-emerald-300 hover:text-emerald-200">← Markets</Link>
          <span className="text-xs uppercase tracking-[0.16em] text-white/25">Powered by Panta</span>
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
            <div className="text-xs uppercase tracking-[0.18em] text-white/30">Current market</div>
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
            {!quoteAvailable && (
              <div className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] px-3 py-2.5 text-xs leading-5 text-amber-100/60">
                Live quote is temporarily unavailable from Panta RPC. Market metadata remains live.
              </div>
            )}
            <div className="mt-5 border-t border-white/10 pt-5">
              <PrimaryBuyPanel marketId={resolvedMarket.id} enabled={resolvedMarket.phase === "primary"} />
            </div>
          </aside>
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.035] p-6">
          <div className="text-sm uppercase tracking-[0.18em] text-white/35">Signal insight</div>
          <h2 className="mt-2 text-2xl font-semibold">Observed movement</h2>
          <p className="mt-4 max-w-3xl leading-7 text-white/60">{insight.text}</p>
          <div className="mt-4 text-xs text-white/30">
            {insight.points.length} stored snapshot{insight.points.length === 1 ? "" : "s"} in the current 24h window.
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/15 p-4">
            {insight.points.length < 2 ? (
              <div className="flex h-44 items-center justify-center text-sm text-white/35">
                Waiting for another snapshot before drawing the 24h probability line.
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between text-xs text-white/35">
                  <span>YES probability</span>
                  <span>
                    {Math.round(insight.points[0].yesProbability * 100)}% → {Math.round(insight.points[insight.points.length - 1].yesProbability * 100)}%
                  </span>
                </div>
                <svg viewBox="0 0 100 100" className="h-44 w-full" preserveAspectRatio="none" role="img" aria-label="24 hour YES probability history">
                  <line x1="0" y1="25" x2="100" y2="25" stroke="currentColor" strokeOpacity="0.08" vectorEffect="non-scaling-stroke" />
                  <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeOpacity="0.08" vectorEffect="non-scaling-stroke" />
                  <line x1="0" y1="75" x2="100" y2="75" stroke="currentColor" strokeOpacity="0.08" vectorEffect="non-scaling-stroke" />
                  <polyline
                    points={historyPolyline(insight.points)}
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
              <div key={trade.id || trade.signature} className="grid gap-3 rounded-xl border border-white/10 bg-black/15 p-4 text-sm md:grid-cols-[1fr_auto_auto] md:items-center">
                <div className="min-w-0">
                  <div className="truncate text-white/70">{trade.wallet}</div>
                  <div className="mt-1 text-xs text-white/35">{formatDate(trade.blockTime)} · {trade.isPrimary ? "Primary" : "Secondary"}</div>
                </div>
                <div className="text-white/60">YES {trade.yesAmount} · NO {trade.noAmount}</div>
                <div className="text-right text-white/35">fee {trade.feePaid} {trade.quoteAsset}</div>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-10 border-t border-white/10 pt-6 text-sm text-white/40">Powered by Panta</footer>
      </div>
    </main>
  );
}
