import Link from "next/link";
import { getMarketDetail, getMarketTrades } from "@/lib/panta";
import { getMarketInsight, recordMarketSnapshots } from "@/lib/history";
import PrimaryBuyPanel from "@/components/PrimaryBuyPanel";

type PageProps = {
  params: Promise<{ marketId: string }>;
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

export default async function MarketDetailPage({ params }: PageProps) {
  const { marketId } = await params;
  const decodedMarketId = decodeURIComponent(marketId);
  const [market, trades] = await Promise.all([
    getMarketDetail(decodedMarketId),
    getMarketTrades(decodedMarketId, 50).catch(() => []),
  ]);
  await recordMarketSnapshots([market]);
  const insight = await getMarketInsight(market);

  return (
    <main className="min-h-screen bg-[#07110d] text-white">
      <div className="mx-auto max-w-5xl px-6 py-8 lg:px-10">
        <Link href="/" className="text-sm text-emerald-300 hover:text-emerald-200">← Market Explorer</Link>

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.035] p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="rounded-full bg-white/[0.06] px-3 py-1.5 text-white/55">{market.category}</span>
            <span className="uppercase tracking-wider text-white/35">{market.phase}</span>
            <span className="uppercase tracking-wider text-white/35">{market.status}</span>
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">{market.title}</h1>
          {market.description && <p className="mt-4 max-w-3xl leading-7 text-white/55">{market.description}</p>}

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] p-5">
              <div className="text-xs uppercase tracking-wider text-white/35">YES</div>
              <div className="mt-2 text-4xl font-semibold text-emerald-200">{pct(market.yesProbability)}</div>
            </div>
            <div className="rounded-2xl border border-rose-300/15 bg-rose-300/[0.05] p-5">
              <div className="text-xs uppercase tracking-wider text-white/35">NO</div>
              <div className="mt-2 text-4xl font-semibold text-rose-200">{pct(market.noProbability)}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/15 p-5">
              <div className="text-xs uppercase tracking-wider text-white/35">Volume</div>
              <div className="mt-2 text-3xl font-semibold">${market.volumeUsdc.toLocaleString()}</div>
            </div>
          </div>
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
          <PrimaryBuyPanel marketId={market.id} enabled={market.phase === "primary"} />
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
