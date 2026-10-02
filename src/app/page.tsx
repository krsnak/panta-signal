import Link from "next/link";
import Image from "next/image";
import { getCurrentPublicRegistryMarkets, getMarketSnapshot } from "@/lib/panta";
import {
  getPersistentTopMovers,
  getRecentlyObservedMarkets,
  getSignalCoverage,
} from "@/lib/history";
import MarketQuote from "@/components/MarketQuote";
import PrimarySignalCard from "@/components/PrimarySignalCard";

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

function isClearlyTestMarket(market: { id: string; title: string; description: string }) {
  const text = `${market.title} ${market.description}`.toLowerCase();
  return (
    market.id.startsWith("TestMarket") ||
    /^\s*\[?test\]?\b/i.test(market.title) ||
    text.includes("sandbox test") ||
    text.includes("fixture market")
  );
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const snapshot = await getMarketSnapshot({
    query: params.q,
    category: params.category,
    limit: 20,
  });
  const [topMovers, signalCoverage, observedMarkets, publicRegistryMarkets] = await Promise.all([
    getPersistentTopMovers(),
    getSignalCoverage(),
    getRecentlyObservedMarkets(),
    getCurrentPublicRegistryMarkets(20).catch(() => []),
  ]);
  const discoveryMarkets =
    publicRegistryMarkets.length > 0 ? publicRegistryMarkets : snapshot.markets;
  const titledMarkets = discoveryMarkets.filter(
    (market) =>
      !market.title.startsWith("Market ") &&
      !market.title.startsWith("Panta market "),
  );
  const hasExplicitCatalogQuery = Boolean(params.q?.trim() || params.category?.trim());
  const observedIds = new Set(observedMarkets.map((market) => market.id));
  const judgeFacingMarkets = titledMarkets
    .filter((market) => hasExplicitCatalogQuery || !isClearlyTestMarket(market))
    .filter((market) => market.phase === "primary" || market.phase === "secondary")
    .sort((a, b) => {
      const score = (market: (typeof titledMarkets)[number]) =>
        (observedIds.has(market.id) ? 1000 : 0) +
        (market.yesProbability !== null && market.noProbability !== null ? 100 : 0) +
        Math.min(market.volumeUsdc, 1000);
      return score(b) - score(a);
    });
  const visibleMarkets =
    judgeFacingMarkets.length > 0
      ? hasExplicitCatalogQuery
        ? judgeFacingMarkets
        : judgeFacingMarkets.slice(0, 6)
      : titledMarkets;
  const liveMarkets = visibleMarkets;
  const primarySignalMarket =
    observedMarkets[0] ??
    topMovers[0]?.market ??
    visibleMarkets[0] ??
    null;

  return (
    <main className="min-h-screen bg-[#090d10] text-white">
      <header className="border-b border-[#1b2228] bg-[#0b0f12]">
        <div className="mx-auto flex max-w-[1480px] items-center gap-5 px-5 py-4 lg:px-8">
          <Link href="/" className="text-2xl font-semibold tracking-tight">Panta Signal</Link>
          <span className="hidden rounded-md bg-[#151b20] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45 sm:inline-flex">
            Solana market intelligence
          </span>
          <div className="ml-auto flex items-center gap-2 text-xs text-white/45">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {snapshot.source === "panta" ? "Live Panta API" : "Sample data"}
          </div>
        </div>
        <div className="mx-auto flex max-w-[1480px] items-center gap-2 overflow-x-auto px-5 pb-3 lg:px-8">
          {[
            ["Signal Feed", "#featured"],
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
        <section className="mb-5 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-emerald-300/15 bg-emerald-300/[0.05] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-200/80">
              Panta intelligence layer on Solana
            </div>
            <h1 className="max-w-4xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Panta Signal turns live prediction markets into clear, verifiable signals.
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">
              We detect what changed, check whether public trading activity supports it, and link the evidence back to Solana.
            </p>
          </div>
          <div className="grid min-w-[280px] gap-2 text-xs sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-xl border border-[#20282e] bg-[#0f1418] px-3 py-2.5">
              <div className="font-medium text-white/75">1 · Detect change</div>
              <div className="mt-1 text-white/30">Live YES/NO probability and movement</div>
            </div>
            <div className="rounded-xl border border-[#20282e] bg-[#0f1418] px-3 py-2.5">
              <div className="font-medium text-white/75">2 · Validate activity</div>
              <div className="mt-1 text-white/30">Public trades + {signalCoverage.observations} stored observations</div>
            </div>
            <div className="rounded-xl border border-[#20282e] bg-[#0f1418] px-3 py-2.5">
              <div className="font-medium text-white/75">3 · Verify on Solana</div>
              <div className="mt-1 text-white/30">Open real transaction signatures</div>
            </div>
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

        <section className="mt-5 rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.035] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/75">
                Verified on Solana
              </div>
              <h2 className="mt-2 text-xl font-semibold">
                Panta market activity is publicly auditable on-chain
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">
                This proof links to a real Panta mainnet transaction containing a SecondaryLimitOrder instruction.
                It verifies public market activity on Solana; it does not claim that every historical probability point shown by Panta Signal is reconstructed on-chain.
              </p>
            </div>
            <a
              href="https://explorer.solana.com/tx/5sfY2QhPs3X57323BmgGhFf2A7x7gxkn4jBpxHQ8fPDMyq4bfPXvRBqQgrjJqi5w11bx4NcwSpysMdLRBn3roRq1"
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15"
            >
              Open Solana transaction ↗
            </a>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-white/35">
            <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1.5">Mainnet</span>
            <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1.5">SecondaryLimitOrder</span>
            <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1.5">Public Panta transaction</span>
            <a
              href="https://explorer.solana.com/address/6gM5afTQBq5VZCfgpGqcsqzfWd5maLSCKWtGjbEobZMp"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/10 bg-black/15 px-3 py-1.5 text-cyan-100/70 transition hover:text-cyan-100"
            >
              Panta program 6gM5…bZMp ↗
            </a>
          </div>
        </section>

        {liveMarkets.length > 0 && (
          <section id="live" className="mt-9 rounded-3xl border border-[#20282e] bg-[#0d1216] p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-white/30">Live now</div>
                <h2 className="mt-2 text-xl font-semibold">Active Panta markets</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
                  Only markets that are currently in primary or secondary trading are shown here. Resolved markets are excluded from the judge-facing homepage.
                </p>
              </div>
              <span className="text-xs text-white/25">
                {liveMarkets.length} live · public Panta registry
              </span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {liveMarkets.map((market) => (
                <Link
                  key={market.id}
                  href={marketDetailHref(market)}
                  className="group overflow-hidden rounded-2xl border border-[#20282e] bg-[#0b0f12] transition hover:-translate-y-0.5 hover:border-[#303b43] hover:bg-[#12181d]"
                >
                  <div className="relative aspect-[16/7.5] overflow-hidden bg-[#151b20]">
                    {market.imageUrl?.includes("res.cloudinary.com") ? (
                      <Image
                        src={market.imageUrl}
                        alt=""
                        fill
                        className="object-cover transition duration-300 group-hover:scale-[1.02]"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_30%,rgba(148,163,184,.14),transparent_48%)]">
                        <span className="text-xs uppercase tracking-[0.18em] text-white/20">Panta market</span>
                      </div>
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
