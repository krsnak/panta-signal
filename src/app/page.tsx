import Link from "next/link";
import Image from "next/image";
import { getCurrentPublicRegistryMarkets, getMarketSnapshot } from "@/lib/panta";
import {
  getRecentlyObservedMarkets,
  getSignalCoverage,
} from "@/lib/history";
import MarketQuote from "@/components/MarketQuote";
import PrimarySignalCard from "@/components/PrimarySignalCard";
import WalletConnectButton from "@/components/WalletConnectButton";
import { getCanonicalSignalFeed } from "@/lib/signal-service";

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
  const [signalCoverage, observedMarkets, publicRegistryMarkets, canonicalFeed] = await Promise.all([
    getSignalCoverage(),
    getRecentlyObservedMarkets(),
    getCurrentPublicRegistryMarkets(20).catch(() => []),
    getCanonicalSignalFeed({ hours: 24, limit: 3 }).catch(() => ({
      signals: [],
      observedCount: 0,
      failedCount: 0,
    })),
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
  const primarySignalMarket = canonicalFeed.signals[0]?.market ?? null;

  return (
    <main className="min-h-screen bg-[#090d10] text-white">
      <header className="border-b border-[#1b2228] bg-[#0b0f12]">
        <div className="mx-auto flex max-w-[1480px] items-center gap-3 px-5 py-3 lg:px-8">
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
          <div className="ml-auto hidden items-center gap-2 text-xs text-white/45 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {snapshot.source === "panta" ? "Live Panta API" : "Sample data"}
          </div>
          <WalletConnectButton compact />
        </div>
      </header>

      <div className="mx-auto max-w-[1480px] px-5 py-6 lg:px-8">
        <section className="relative mb-5 overflow-hidden rounded-[28px] border border-[#263038] bg-[#0d1317] p-6 sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute inset-0 opacity-70">
            <div className="absolute -right-16 -top-24 h-80 w-80 rounded-full bg-emerald-300/[0.08] blur-3xl" />
            <div className="absolute bottom-0 right-0 h-40 w-[55%] bg-[linear-gradient(135deg,transparent_20%,rgba(94,234,212,.08)_20%,rgba(94,234,212,.08)_21%,transparent_21%,transparent_42%,rgba(167,139,250,.07)_42%,rgba(167,139,250,.07)_43%,transparent_43%)]" />
          </div>
          <div className="relative grid gap-8 lg:grid-cols-[1.45fr_.75fr] lg:items-end">
            <div>
              <div className="mb-4 inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/[0.06] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200/85">
                Panta-native signal layer on Solana
              </div>
              <div className="text-5xl font-semibold tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                Panta Signal
              </div>
              <h1 className="mt-5 max-w-4xl text-2xl font-semibold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
                From market context to verifiable action.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50 sm:text-base">
                Panta Intelligence explains the market. Panta Signal adds the live layer: what changed, whether trading confirms it, and how to verify or act on it.
              </p>
            </div>
            <div className="grid gap-2.5 text-sm">
              {[
                ["1", "Detect", "Meaningful YES/NO movement, not just a raw price"],
                ["2", "Validate", `Public trades + ${signalCoverage.observations} stored observations`],
                ["3", "Trade", "Primary via external Solana wallet, secondary via Panta"],
                ["4", "Verify", "Follow the resulting activity back to Solana"],
              ].map(([step, title, description]) => (
                <div key={step} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-300/10 text-xs font-semibold text-emerald-200">{step}</span>
                    <div>
                      <div className="font-medium text-white/85">{title}</div>
                      <div className="mt-0.5 text-xs text-white/35">{description}</div>
                    </div>
                  </div>
                </div>
              ))}
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
                imageUrl: primarySignalMarket.imageUrl,
              }}
              href={marketDetailHref(primarySignalMarket)}
            />
          ) : (
            <section id="featured" className="rounded-[28px] border border-[#263038] bg-[#0f1418] p-8">
              <div className="text-xs uppercase tracking-[0.18em] text-white/30">Signal Feed</div>
              <h2 className="mt-3 text-3xl font-semibold">No meaningful signal right now</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">
                Markets stay in the catalog, but this featured slot is reserved for evidence-backed movement or real trading activity. Panta Signal does not promote a flat or inactive market just to fill the space.
              </p>
            </section>
          )}
        </div>

        <section className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.03] px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200/70">Verified on Solana</div>
              <h2 className="mt-1.5 text-lg font-semibold">Real Panta activity, independently verifiable.</h2>
              <p className="mt-1 max-w-3xl text-sm leading-5 text-white/40">
                One link proves a real Panta transaction. The other opens the Panta program that runs on Solana mainnet.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href="https://explorer.solana.com/tx/5sfY2QhPs3X57323BmgGhFf2A7x7gxkn4jBpxHQ8fPDMyq4bfPXvRBqQgrjJqi5w11bx4NcwSpysMdLRBn3roRq1"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15"
              >
                View real transaction ↗
              </a>
              <a
                href="https://explorer.solana.com/address/6gM5afTQBq5VZCfgpGqcsqzfWd5maLSCKWtGjbEobZMp"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/[0.08] hover:text-white"
              >
                View Panta program ↗
              </a>
            </div>
          </div>
        </section>

        {liveMarkets.length > 0 && (
          <section id="live" className="mt-9 rounded-3xl border border-[#20282e] bg-[#0d1216] p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-white/30">Current registry</div>
                <h2 className="mt-2 text-xl font-semibold">Current Panta markets</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
                  Current primary and secondary markets from Panta. Markets without real price discovery remain visible, but are not presented as meaningful 50/50 signals.
                </p>
              </div>
              <span className="text-xs text-white/25">
                {liveMarkets.length} current · public Panta registry
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
                      <MarketQuote
                        marketId={market.id}
                        initialQuote={{
                          yesProbability: market.yesProbability,
                          noProbability: market.noProbability,
                          phase: market.phase,
                          volumeUsdc: market.volumeUsdc,
                        }}
                      />
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
