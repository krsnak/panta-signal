import Link from "next/link";
import Image from "next/image";
import { getMarketSnapshot, getWalletPositions } from "@/lib/panta";
import { getTopMovers, recordMarketSnapshots } from "@/lib/history";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    status?: string;
    wallet?: string;
  }>;
};

function pct(value: number | null) {
  if (value === null) return "—";
  if (value === 0 || value === 1) return `${value * 100}%`;
  return `${(value * 100).toFixed(1)}%`;
}

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
    status: params.status,
    limit: 20,
  });
  if (snapshot.source === "panta") {
    await recordMarketSnapshots(snapshot.markets);
  }
  const topMovers = await getTopMovers(snapshot.markets);
  const wallet = params.wallet?.trim() || "";
  let positions = null;
  let walletError = null;
  if (wallet) {
    try {
      positions = await getWalletPositions(wallet);
    } catch (error) {
      walletError = error instanceof Error ? error.message : "Unable to load wallet positions";
    }
  }
  const completeMarkets = snapshot.markets.filter(
    (market) =>
      !market.title.startsWith("Market ") &&
      market.yesProbability !== null &&
      market.noProbability !== null,
  );
  const tradingMarkets = completeMarkets
    .filter((market) => market.phase !== "resolved" && market.volumeUsdc > 0)
    .sort((a, b) => b.volumeUsdc - a.volumeUsdc);
  const initialMarkets = completeMarkets.filter(
    (market) => market.phase !== "resolved" && market.volumeUsdc === 0,
  );
  const resolvedMarkets = completeMarkets.filter((market) => market.phase === "resolved");
  const featuredMarket =
    tradingMarkets.find((market) => market.imageUrl) ??
    tradingMarkets[0] ??
    initialMarkets.find((market) => market.imageUrl) ??
    initialMarkets[0] ??
    snapshot.markets.find((market) => market.imageUrl) ??
    snapshot.markets[0];
  const liveMarkets = tradingMarkets
    .filter((market) => market.id !== featuredMarket?.id)
    .slice(0, 5);
  const moreMarkets = snapshot.markets
    .filter(
      (market) =>
        market.id !== featuredMarket?.id &&
        !liveMarkets.some((item) => item.id === market.id) &&
        !initialMarkets.some((item) => item.id === market.id) &&
        !resolvedMarkets.some((item) => item.id === market.id),
    )
    .slice(0, 6);

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
            ["Featured", "#featured"],
            ["Volume", "#volume"],
            ["Live", "#live"],
            ["Initial", "#initial"],
            ["Resolved", "#resolved"],
            ["Signal", "#signal"],
            ["Wallet", "#wallet"],
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
              ["Markets", snapshot.markets.length],
              ["Trading", tradingMarkets.length],
              ["Initial", initialMarkets.length],
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
          <form className="grid gap-3 md:grid-cols-[1fr_180px_160px_auto]" action="/">
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
            <select name="status" defaultValue={params.status || ""} className="rounded-xl border border-[#273139] bg-[#0b0f12] px-4 py-3 text-sm">
              <option value="">All phases</option>
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
              <option value="resolved">Resolved</option>
            </select>
            <button className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#090d10] transition hover:bg-white/90">Search</button>
          </form>
        </section>

        {featuredMarket && (
          <section id="featured" className="mt-5 overflow-hidden rounded-[24px] border border-[#20282e] bg-[#0f1418]">
            <div className="grid lg:grid-cols-[1.05fr_.95fr]">
              <div className="relative min-h-[280px] overflow-hidden bg-[#0b0f12] lg:min-h-[360px]">
                {featuredMarket.imageUrl ? (
                  <Image
                    src={featuredMarket.imageUrl}
                    alt=""
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 52vw"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(52,211,153,.18),transparent_45%)]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f1418] via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-[#0f1418]" />
                <div className="absolute left-5 top-5 flex gap-2">
                  <span className="rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur">{featuredMarket.category}</span>
                  <span className="rounded-full bg-[#182027] px-3 py-1.5 text-xs font-semibold text-white/70">Featured</span>
                </div>
              </div>
              <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-white/35">{featuredMarket.phase} market</div>
                <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.025em] sm:text-4xl">{featuredMarket.title}</h2>
                {featuredMarket.description && <p className="mt-4 line-clamp-3 leading-7 text-white/45">{featuredMarket.description}</p>}
                <div className="mt-7 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.07] p-4">
                    <div className="text-xs uppercase tracking-[0.15em] text-white/35">YES</div>
                    <div className="mt-1 text-4xl font-semibold text-emerald-200">{pct(featuredMarket.yesProbability)}</div>
                  </div>
                  <div className="rounded-2xl border border-rose-300/20 bg-rose-300/[0.06] p-4">
                    <div className="text-xs uppercase tracking-[0.15em] text-white/35">NO</div>
                    <div className="mt-1 text-4xl font-semibold text-rose-200">{pct(featuredMarket.noProbability)}</div>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between text-sm text-white/35">
                  <span>{featuredMarket.status}</span>
                  <span>{money(featuredMarket.volumeUsdc)} volume</span>
                </div>
                <Link href={marketDetailHref(featuredMarket)} className="mt-7 inline-flex w-fit rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#090d10] transition hover:bg-white/90">
                  View market →
                </Link>
              </div>
            </div>
          </section>
        )}

        {liveMarkets.length > 0 && (
          <section id="live" className="mt-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-white/30">Volume</div>
                <h2 className="mt-2 text-2xl font-semibold">Trading now</h2>
                <p className="mt-1 text-sm text-white/35">Only markets with non-zero Panta volume.</p>
              </div>
              <span className="text-sm text-white/30">{completeMarkets.length} quoted</span>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {liveMarkets.map((market) => (
                <Link key={market.id} href={marketDetailHref(market)} className="group overflow-hidden rounded-2xl border border-[#20282e] bg-[#0f1418] transition hover:-translate-y-0.5 hover:border-[#303b43] hover:bg-[#12181d]">
                  <div className="relative aspect-[16/8.5] overflow-hidden bg-black/25">
                    {market.imageUrl ? (
                      <Image src={market.imageUrl} alt="" fill className="object-cover transition duration-300 group-hover:scale-[1.02]" sizes="(max-width: 768px) 100vw, 33vw" />
                    ) : (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(52,211,153,.16),transparent_45%)]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f1418] via-transparent to-transparent" />
                    <span className="absolute left-4 top-4 rounded-full bg-black/55 px-2.5 py-1 text-xs text-white/70 backdrop-blur">{market.category}</span>
                  </div>
                  <div className="p-5">
                    <h3 className="min-h-[3.5rem] text-lg font-medium leading-7">{market.title}</h3>
                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-emerald-300/[0.08] px-3 py-2.5 text-emerald-200"><span className="text-xs text-white/35">YES</span><span className="float-right font-semibold">{pct(market.yesProbability)}</span></div>
                      <div className="rounded-xl bg-rose-300/[0.07] px-3 py-2.5 text-rose-200"><span className="text-xs text-white/35">NO</span><span className="float-right font-semibold">{pct(market.noProbability)}</span></div>
                    </div>
                    <div className="mt-4 flex justify-between text-xs text-white/30"><span>{market.phase}</span><span>{money(market.volumeUsdc)} vol.</span></div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {initialMarkets.length > 0 && (
          <section id="initial" className="mt-9 rounded-3xl border border-[#20282e] bg-[#0f1418] p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-amber-300/65">Initial</div>
                <h2 className="mt-2 text-2xl font-semibold">Not traded yet</h2>
                <p className="mt-1 text-sm text-white/35">50/50 is the starting price here. These markets currently have $0 Panta volume.</p>
              </div>
              <span className="text-sm text-white/30">{initialMarkets.length} markets</span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {initialMarkets.slice(0, 6).map((market) => (
                <Link key={market.id} href={marketDetailHref(market)} className="flex items-center gap-4 rounded-2xl border border-[#20282e] bg-[#0b0f12] p-3 transition hover:border-[#303b43]">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#151b20]">
                    {market.imageUrl && <Image src={market.imageUrl} alt="" fill className="object-cover" sizes="64px" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-sm font-medium leading-5">{market.title}</div>
                    <div className="mt-2 flex items-center gap-3 text-xs">
                      <span className="text-emerald-300/70">YES {pct(market.yesProbability)}</span>
                      <span className="text-rose-300/70">NO {pct(market.noProbability)}</span>
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] text-white/25">$0 vol.</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {resolvedMarkets.length > 0 && (
          <section id="resolved" className="mt-9 rounded-3xl border border-[#20282e] bg-[#0f1418] p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-white/30">Ended</div>
                <h2 className="mt-2 text-2xl font-semibold">Resolved markets</h2>
                <p className="mt-1 text-sm text-white/35">Final 100/0 outcomes are separated from active pricing.</p>
              </div>
              <span className="text-sm text-white/30">{resolvedMarkets.length} markets</span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {resolvedMarkets.slice(0, 6).map((market) => (
                <Link key={market.id} href={marketDetailHref(market)} className="flex items-center gap-4 rounded-2xl border border-[#20282e] bg-[#0b0f12] p-3 transition hover:border-[#303b43]">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#151b20]">
                    {market.imageUrl && <Image src={market.imageUrl} alt="" fill className="object-cover" sizes="64px" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-sm font-medium leading-5">{market.title}</div>
                    <div className="mt-2 text-xs text-white/35">{money(market.volumeUsdc)} volume</div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-semibold text-emerald-300/75">YES {pct(market.yesProbability)}</div>
                    <div className="mt-1 font-semibold text-rose-300/75">NO {pct(market.noProbability)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {moreMarkets.length > 0 && (
          <section className="mt-9 rounded-3xl border border-white/10 bg-white/[0.025] p-6">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-white/30">Explore</div>
                <h2 className="mt-2 text-2xl font-semibold">More Panta markets</h2>
              </div>
              <span className="text-xs text-white/25">Quote availability depends on Panta RPC</span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {moreMarkets.map((market) => (
                <Link key={market.id} href={marketDetailHref(market)} className="flex gap-4 rounded-2xl border border-white/10 bg-black/15 p-3 transition hover:border-white/20">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white/[0.04]">
                    {market.imageUrl && <Image src={market.imageUrl} alt="" fill className="object-cover" sizes="80px" />}
                  </div>
                  <div className="min-w-0 py-1">
                    <div className="text-xs text-white/30">{market.category} · {market.phase}</div>
                    <div className="mt-1 line-clamp-2 text-sm font-medium leading-5">{market.title}</div>
                    <div className="mt-2 text-xs text-white/30">
                      {market.yesProbability === null ? "Live quote unavailable" : `YES ${pct(market.yesProbability)} · ${money(market.volumeUsdc)} vol.`}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section id="signal" className="mt-9 rounded-3xl border border-[#20282e] bg-[#0f1418] p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.18em] text-white/35">Top movers</div>
              <h2 className="mt-2 text-2xl font-semibold">Observed probability shifts</h2>
              <p className="mt-2 text-sm text-white/45">Calculated from Panta Signal&apos;s stored Panta price snapshots.</p>
            </div>
            <span className="text-xs text-white/30">24h observation window</span>
          </div>

          {topMovers.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-5 text-sm leading-6 text-white/45">
              Collecting history. Two snapshots of the same market are required before a real mover can be calculated.
            </div>
          ) : (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {topMovers.map((mover) => (
                <Link
                  key={mover.market.id}
                  href={marketDetailHref(mover.market)}
                  className="rounded-2xl border border-[#20282e] bg-[#0b0f12] p-5 transition hover:border-[#303b43]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="text-sm text-white/75">{mover.market.title}</div>
                    <span className={mover.changePoints >= 0 ? "shrink-0 font-medium text-emerald-300" : "shrink-0 font-medium text-rose-300"}>
                      {mover.changePoints >= 0 ? "+" : ""}{mover.changePoints.toFixed(1)} pts
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/45">{mover.insight}</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section id="wallet" className="mt-5 rounded-3xl border border-[#20282e] bg-[#0f1418] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.18em] text-white/35">Wallet view</div>
              <h2 className="mt-2 text-2xl font-semibold">Solana positions</h2>
              <p className="mt-2 text-sm text-white/45">Read-only Panta holdings. No seed phrase or private key is requested.</p>
            </div>
            <form action="/" className="flex w-full max-w-xl gap-2">
              <input type="hidden" name="q" value={params.q || ""} />
              <input type="hidden" name="category" value={params.category || ""} />
              <input type="hidden" name="status" value={params.status || ""} />
              <input
                name="wallet"
                defaultValue={wallet}
                placeholder="Solana wallet address"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none placeholder:text-white/30"
              />
              <button className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm font-medium text-emerald-200">
                Load
              </button>
            </form>
          </div>

          {walletError && (
            <div className="mt-5 rounded-xl border border-rose-300/20 bg-rose-300/[0.05] p-4 text-sm text-rose-100">
              {walletError}
            </div>
          )}

          {positions && (
            <div className="mt-5">
              {positions.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/15 p-5 text-sm text-white/45">
                  No Panta positions found for this wallet.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {positions.map((position, index) => (
                    <div
                      key={`${position.marketId}-${position.side}-${index}`}
                      className="rounded-xl border border-white/10 bg-black/15 p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className={position.side === "yes" ? "font-medium text-emerald-300" : "font-medium text-rose-300"}>
                          {position.side.toUpperCase()}
                        </span>
                        <span className="text-xs text-white/35">{position.phase}</span>
                      </div>
                      <div className="mt-3 text-2xl font-semibold">{position.shares.toLocaleString()} shares</div>
                      <div className="mt-2 truncate text-xs text-white/35">{position.marketId}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        <section className="mt-5 grid gap-5 md:grid-cols-3">
          {[["Market detail", "Spot probability, trade tape and observed history."], ["Wallet positions", "Read current YES/NO exposure for a wallet."], ["Signal insight", "Grounded explanation from stored Panta probability snapshots."]].map(([title, copy]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-base font-medium">{title}</div>
              <p className="mt-2 text-sm leading-6 text-white/45">{copy}</p>
            </div>
          ))}
        </section>

        <footer className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-sm text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <span>Panta Signal · Hackathon MVP</span>
          <span className="font-medium text-white/55">Powered by Panta</span>
        </footer>
      </div>
    </main>
  );
}
