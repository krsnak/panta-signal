import Link from "next/link";
import Image from "next/image";
import { getMarketSnapshot } from "@/lib/panta";
import {
  getPersistentTopMovers,
  getRecentlyObservedMarkets,
  getSignalCoverage,
} from "@/lib/history";
import WalletPositionsLookup from "@/components/WalletPositionsLookup";
import MarketQuote from "@/components/MarketQuote";
import PrimarySignalCard from "@/components/PrimarySignalCard";
import SignalList from "@/components/SignalList";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
  }>;
};

function marketDetailHref(market: {
  id: string;
  title: string;
  description: string;
  category: string;
  phase: string;
  status: string;
  yesProbability: number | null;
  noProbability: number | null;
  volumeUsdc: number;
  imageUrl?: string | null;
}) {
  const params = new URLSearchParams({
    title: market.title,
    category: market.category,
    phase: market.phase,
    status: market.status,
    volume: String(market.volumeUsdc),
  });
  if (market.description) params.set("description", market.description);
  if (market.yesProbability !== null) params.set("yes", String(market.yesProbability));
  if (market.noProbability !== null) params.set("no", String(market.noProbability));
  if (market.imageUrl) params.set("image", market.imageUrl);
  return `/markets/${encodeURIComponent(market.id)}?${params.toString()}`;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const snapshot = await getMarketSnapshot({
    query: params.q,
    category: params.category,
    limit: 20,
  });
  const [topMovers, signalCoverage, observedMarkets] = await Promise.all([
    getPersistentTopMovers(),
    getSignalCoverage(),
    getRecentlyObservedMarkets(),
  ]);
  const titledMarkets = snapshot.markets.filter(
    (market) => !market.title.startsWith("Market "),
  );
  const primarySignalMarket =
    observedMarkets[0] ??
    topMovers[0]?.market ??
    titledMarkets[0] ??
    null;
  const actionableMarket =
    observedMarkets.find((market) => market.phase === "primary") ??
    titledMarkets.find((market) => market.phase === "primary") ??
    null;

  return (
    <main className="min-h-screen bg-[#090d10] text-white">
      <header className="border-b border-[#1b2228] bg-[#0b0f12]">
        <div className="mx-auto flex max-w-[1480px] items-center gap-5 px-5 py-4 lg:px-8">
          <Link href="/" className="text-2xl font-semibold tracking-tight">Panta Signal</Link>
          <span className="hidden rounded-md bg-[#151b20] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45 sm:inline-flex">
            API Sidetrack
          </span>
          <div className="ml-auto flex items-center gap-2 text-xs text-white/45">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {snapshot.source === "panta" ? "Live Panta API" : "Sample data"}
          </div>
        </div>
        <div className="mx-auto flex max-w-[1480px] items-center gap-2 overflow-x-auto px-5 pb-3 lg:px-8">
          {[
            ["Signal Feed", "#featured"],
            ["More signals", "#signal"],
            ["Wallet", "#wallet"],
            ["Execute", "#execute"],
            ["Markets", "#live"],
          ].map(([label, href], index) => (
            <a
              key={label}
              href={href}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm transition ${index === 0 ? "bg-[#151b20] text-white" : "text-white/55 hover:bg-[#151b20] hover:text-white"}`}
            >
              {label}
            </a>
          ))}
        </div>
      </header>

      <div className="mx-auto max-w-[1480px] px-5 py-6 lg:px-8">
        <section className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Know what changed on Panta — and why it matters</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">
              Signal Feed combines live YES/NO pricing, durable probability history and public trades so you can see whether a market moved, trading activity picked up, or nothing meaningful changed.
            </p>
          </div>
          <div className="flex gap-2">
            {[
              ["Observations", signalCoverage.observations],
              ["Markets tracked", signalCoverage.marketsObserved],
              ["Price movers", topMovers.length],
            ].map(([label, value]) => (
              <div key={label} className="min-w-[92px] rounded-xl border border-[#20282e] bg-[#0f1418] px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-[0.14em] text-white/30">{label}</div>
                <div className="mt-1 text-lg font-semibold">{value}</div>
              </div>
            ))}
          </div>
        </section>

        {snapshot.source !== "panta" && (
          <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-sm text-amber-100">Live Panta API configuration is not set yet, so the UI is running on clearly labeled sample data.</div>
        )}

        <div className="mt-5">
          {primarySignalMarket ? (
            <PrimarySignalCard
              fallback={{
                id: primarySignalMarket.id,
                title: primarySignalMarket.title,
                category: primarySignalMarket.category,
                yesProbability: primarySignalMarket.yesProbability,
                noProbability: primarySignalMarket.noProbability,
                volumeUsdc: primarySignalMarket.volumeUsdc,
              }}
              href={marketDetailHref(primarySignalMarket)}
            />
          ) : (
            <section id="featured" className="rounded-[28px] border border-[#263038] bg-[#0f1418] p-8">
              <div className="text-xs uppercase tracking-[0.18em] text-white/30">Signal Feed</div>
              <h2 className="mt-3 text-3xl font-semibold">Waiting for the first observable Panta market</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">
                Signal Feed requires a real Panta market detail or a durable stored observation. No sample mover is substituted.
              </p>
            </section>
          )}
        </div>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.08fr_.92fr]">
          <div id="signal" className="rounded-3xl border border-[#20282e] bg-[#0f1418] p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-white/30">More signals</div>
                <h2 className="mt-2 text-2xl font-semibold">Observed signal queue</h2>
                <p className="mt-2 text-sm text-white/40">Movement first, then real trading activity, then flat/collecting markets. Resolved markets are excluded.</p>
              </div>
              <span className="text-xs text-white/30">24h</span>
            </div>

            <div className="mt-5">
              <SignalList excludeMarketId={primarySignalMarket?.id} />
            </div>

          </div>

          <div className="grid gap-5">
            <div id="wallet" className="rounded-3xl border border-[#20282e] bg-[#0f1418] p-6">
              <div className="text-xs uppercase tracking-[0.18em] text-white/30">Wallet Intelligence</div>
              <h2 className="mt-2 text-2xl font-semibold">Your Panta exposure</h2>
              <p className="mt-2 text-sm leading-6 text-white/45">Read-only Solana position lookup. No seed phrase or private key is requested.</p>
              <div className="mt-5"><WalletPositionsLookup /></div>
            </div>

            <div id="execute" className="rounded-3xl border border-[#20282e] bg-[#0f1418] p-6">
              <div className="text-xs uppercase tracking-[0.18em] text-white/30">Solana Execution</div>
              <h2 className="mt-2 text-2xl font-semibold">Act on a signal, non-custodially</h2>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/55">
                {["Connect Phantom", "Panta quote", "Build", "Sign on Solana", "Panta verify"].map((step, index) => (
                  <span key={step} className="rounded-full border border-[#273139] bg-[#0b0f12] px-3 py-2">{index + 1}. {step}</span>
                ))}
              </div>
              {actionableMarket ? (
                <Link href={marketDetailHref(actionableMarket)} className="mt-5 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#090d10]">
                  Open execution workspace →
                </Link>
              ) : (
                <div className="mt-5 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-4 text-sm leading-6 text-amber-100/60">
                  Panta currently exposes no primary market in the live catalog, so a real buy transaction cannot be built right now. Phantom connection and wallet positions remain fully functional; execution activates automatically when a primary market opens.
                </div>
              )}
            </div>
          </div>
        </section>

        {titledMarkets.length > 0 && (
          <section id="live" className="mt-9 rounded-3xl border border-[#20282e] bg-[#0f1418] p-6">
            <form className="mb-6 grid gap-3 rounded-2xl border border-[#20282e] bg-[#0b0f12] p-3 md:grid-cols-[1fr_200px_auto]" action="/">
              <input
                name="q"
                defaultValue={params.q || ""}
                placeholder="Search title, description or category"
                className="rounded-xl border border-[#273139] bg-[#090d10] px-4 py-3 text-sm outline-none transition focus:border-white/25 placeholder:text-white/25"
              />
              <select name="category" defaultValue={params.category || ""} className="rounded-xl border border-[#273139] bg-[#090d10] px-4 py-3 text-sm">
                <option value="">All categories</option>
                {snapshot.categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <button className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#090d10] transition hover:bg-white/90">Search markets</button>
            </form>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-white/30">Market Explorer</div>
                <h2 className="mt-2 text-2xl font-semibold">Panta markets</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
                  The catalog supplies identity and discovery. Each card hydrates its actual phase, price and volume from Panta market detail so stale catalog metadata is never presented as trading state.
                </p>
              </div>
              <span className="text-xs text-white/25">{titledMarkets.length} catalog markets</span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {titledMarkets.map((market) => (
                <Link
                  key={market.id}
                  href={marketDetailHref(market)}
                  className="group overflow-hidden rounded-2xl border border-[#20282e] bg-[#0b0f12] transition hover:-translate-y-0.5 hover:border-[#303b43] hover:bg-[#12181d]"
                >
                  <div className="relative aspect-[16/7.5] overflow-hidden bg-[#151b20]">
                    {market.imageUrl ? (
                      <Image
                        src={market.imageUrl}
                        alt=""
                        fill
                        className="object-cover transition duration-300 group-hover:scale-[1.02]"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(148,163,184,.14),transparent_48%)]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f12] via-transparent to-transparent" />
                    <span className="absolute left-4 top-4 rounded-full bg-black/55 px-2.5 py-1 text-xs text-white/70 backdrop-blur">
                      {market.category}
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="min-h-[3.5rem] text-base font-medium leading-6 text-white/85">
                      {market.title}
                    </h3>
                    <div className="mt-4">
                      <MarketQuote marketId={market.id} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-sm text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <span>Panta Signal · Prediction market intelligence</span>
          <span className="font-medium text-white/55">Powered by Panta</span>
        </footer>
      </div>
    </main>
  );
}
