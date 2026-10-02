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
import MarketActivitySignal from "@/components/MarketActivitySignal";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
  }>;
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

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
  const signalHero = topMovers[0] ?? null;
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
            ["Signal Pulse", "#featured"],
            ["Top Movers", "#signal"],
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
            <h1 className="text-3xl font-semibold tracking-tight">Market intelligence inside the Panta ecosystem</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">
              Same market environment, with signal tracking, wallet exposure and observed probability history layered on top.
            </p>
          </div>
          <div className="flex gap-2">
            {[
              ["Catalog", titledMarkets.length],
              ["Observed", signalCoverage.marketsObserved],
              ["Signals", topMovers.length],
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

        <section className="rounded-2xl border border-[#20282e] bg-[#0f1418] p-3">
          <form className="grid gap-3 md:grid-cols-[1fr_200px_auto]" action="/">
            <input
              name="q"
              defaultValue={params.q || ""}
              placeholder="Search title, description or category"
              className="rounded-xl border border-[#273139] bg-[#0b0f12] px-4 py-3 text-sm outline-none transition focus:border-white/25 placeholder:text-white/25"
            />
            <select name="category" defaultValue={params.category || ""} className="rounded-xl border border-[#273139] bg-[#0b0f12] px-4 py-3 text-sm">
              <option value="">All categories</option>
              {snapshot.categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <button className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#090d10] transition hover:bg-white/90">Search</button>
          </form>
        </section>

        <section id="featured" className="mt-5 rounded-[24px] border border-[#20282e] bg-[#0f1418] p-6 sm:p-8">
          <div className="text-xs uppercase tracking-[0.18em] text-white/30">Signal Pulse</div>
          {signalHero ? (
            <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px]">
              <div>
                <div className="flex items-center gap-3">
                  <span className={signalHero.changePoints >= 0 ? "text-3xl font-semibold text-emerald-300" : "text-3xl font-semibold text-rose-300"}>
                    {signalHero.changePoints >= 0 ? "+" : ""}{signalHero.changePoints.toFixed(1)} pts
                  </span>
                  <span className="text-sm text-white/35">24h observed move</span>
                </div>
                <h2 className="mt-4 text-3xl font-semibold leading-tight">{signalHero.market.title}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">{signalHero.insight}</p>
                <Link href={marketDetailHref(signalHero.market)} className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#090d10]">Inspect signal →</Link>
              </div>
              <div className="rounded-2xl border border-[#20282e] bg-[#0b0f12] p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-white/30">Current quote</div>
                <div className="mt-4"><MarketQuote marketId={signalHero.market.id} /></div>
                <div className="mt-4 text-xs text-white/30">{money(signalHero.market.volumeUsdc)} volume</div>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_300px]">
              <div>
                <h2 className="text-3xl font-semibold">
                  {signalCoverage.marketsWithHistory > 0
                    ? "No material probability move detected yet"
                    : "Building the first real signal window"}
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">
                  {signalCoverage.marketsWithHistory > 0
                    ? "Real durable observations exist, but none has moved enough to qualify as a signal. Panta Signal will not promote a flat market just to fill the hero."
                    : "Panta Signal will promote a market here only after durable price history proves a real probability move. No arbitrary featured market is substituted."}
                </p>
              </div>
              <div className="rounded-2xl border border-[#20282e] bg-[#0b0f12] p-4 text-sm text-white/45">
                <div className="font-medium text-white/70">Signal coverage</div>
                <div className="mt-3">{signalCoverage.observations} observations</div>
                <div className="mt-1">{signalCoverage.marketsObserved} markets observed</div>
                <div className="mt-1">{signalCoverage.marketsWithHistory} with 2+ snapshots</div>
              </div>
            </div>
          )}
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.08fr_.92fr]">
          <div id="signal" className="rounded-3xl border border-[#20282e] bg-[#0f1418] p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-white/30">Signal Feed</div>
                <h2 className="mt-2 text-2xl font-semibold">Top Movers</h2>
                <p className="mt-2 text-sm text-white/40">Ranked only from durable Panta price observations.</p>
              </div>
              <span className="text-xs text-white/30">24h</span>
            </div>

            {topMovers.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-5 text-sm leading-6 text-white/45">
                {signalCoverage.marketsWithHistory > 0
                  ? "History is live, but no observed move currently clears the material-movement threshold."
                  : "Durable collection is active. The first mover appears after two real observations of the same market."}
              </div>
            ) : (
              <div className="mt-5 divide-y divide-[#20282e]">
                {topMovers.map((mover, index) => (
                  <Link key={mover.market.id} href={marketDetailHref(mover.market)} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                    <span className="mt-0.5 w-5 text-xs font-semibold text-white/20">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-1 text-sm font-medium text-white/80">{mover.market.title}</div>
                      <div className="mt-1 line-clamp-2 text-xs leading-5 text-white/35">{mover.insight}</div>
                    </div>
                    <span className={mover.changePoints >= 0 ? "shrink-0 text-sm font-semibold text-emerald-300" : "shrink-0 text-sm font-semibold text-rose-300"}>
                      {mover.changePoints >= 0 ? "+" : ""}{mover.changePoints.toFixed(1)} pts
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {observedMarkets.length > 0 && (
              <div className="mt-6 border-t border-[#20282e] pt-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-white/25">Recent activity</div>
                    <div className="mt-1 text-sm text-white/45">
                      Trade-tape signals from the last 24 hours.
                    </div>
                  </div>
                  <span className="text-[11px] text-white/25">shares, not USD</span>
                </div>
                <div className="mt-4 grid gap-3">
                  {observedMarkets.slice(0, 3).map((market) => (
                    <MarketActivitySignal
                      key={market.id}
                      marketId={market.id}
                      title={market.title}
                    />
                  ))}
                </div>
              </div>
            )}
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
