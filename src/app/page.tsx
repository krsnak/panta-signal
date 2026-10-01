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
  return value === null ? "—" : `${Math.round(value * 100)}%`;
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
  const featuredMarket =
    completeMarkets.find((market) => market.imageUrl) ??
    completeMarkets[0] ??
    snapshot.markets.find((market) => market.imageUrl) ??
    snapshot.markets[0];
  const liveMarkets = completeMarkets
    .filter((market) => market.id !== featuredMarket?.id)
    .slice(0, 5);
  const moreMarkets = snapshot.markets
    .filter((market) => market.id !== featuredMarket?.id && !liveMarkets.some((item) => item.id === market.id))
    .slice(0, 6);

  return (
    <main className="min-h-screen bg-[#07110d] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <header className="flex flex-col gap-6 border-b border-white/10 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.16em]">
              <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1.5 text-emerald-200">Panta API Sidetrack</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-white/45">Crypto World&apos;s Fair</span>
            </div>
            <h1 className="text-5xl font-semibold tracking-[-0.04em] sm:text-6xl">Panta Signal</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-white/55">
              Live prediction-market discovery, observed probability movement and non-custodial execution — powered by Panta.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[420px]">
            {[
              ["Markets", String(snapshot.markets.length)],
              ["Live quotes", String(completeMarkets.length)],
              ["API", snapshot.source === "panta" ? "Live" : "Sample"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4">
                <div className="text-xs uppercase tracking-[0.14em] text-white/30">{label}</div>
                <div className="mt-2 text-xl font-semibold text-white">{value}</div>
              </div>
            ))}
          </div>
        </header>

        {snapshot.source !== "panta" && (
          <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-sm text-amber-100">Live Panta API configuration is not set yet, so the UI is running on clearly labeled sample data.</div>
        )}

        <section className="mt-7 rounded-2xl border border-white/10 bg-[#0c1713]/90 p-3 shadow-2xl shadow-black/20 backdrop-blur">
          <form className="grid gap-3 md:grid-cols-[1fr_180px_160px_auto]" action="/">
            <input
              name="q"
              defaultValue={params.q || ""}
              placeholder="Search title, description or category"
              className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none transition focus:border-emerald-300/35 placeholder:text-white/25"
            />
            <select name="category" defaultValue={params.category || ""} className="rounded-xl border border-white/10 bg-[#0b1712] px-4 py-3 text-sm">
              <option value="">All categories</option>
              {snapshot.categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select name="status" defaultValue={params.status || ""} className="rounded-xl border border-white/10 bg-[#0b1712] px-4 py-3 text-sm">
              <option value="">All phases</option>
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
              <option value="resolved">Resolved</option>
            </select>
            <button className="rounded-xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-[#06100c] transition hover:bg-emerald-200">Explore markets</button>
          </form>
        </section>

        {featuredMarket && (
          <section className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1612] shadow-2xl shadow-black/30">
            <div className="grid lg:grid-cols-[1.05fr_.95fr]">
              <div className="relative min-h-[300px] overflow-hidden bg-black/25 lg:min-h-[420px]">
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
                <div className="absolute inset-0 bg-gradient-to-t from-[#07110d] via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-[#0b1612]" />
                <div className="absolute left-5 top-5 flex gap-2">
                  <span className="rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur">{featuredMarket.category}</span>
                  <span className="rounded-full bg-emerald-300 px-3 py-1.5 text-xs font-semibold text-[#07110d]">Featured</span>
                </div>
              </div>
              <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300/80">{featuredMarket.phase} market</div>
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
                <Link href={marketDetailHref(featuredMarket)} className="mt-7 inline-flex w-fit rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#07110d] transition hover:bg-emerald-100">
                  View market →
                </Link>
              </div>
            </div>
          </section>
        )}

        {liveMarkets.length > 0 && (
          <section className="mt-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-white/30">Live now</div>
                <h2 className="mt-2 text-2xl font-semibold">Markets with live quotes</h2>
              </div>
              <span className="text-sm text-white/30">{completeMarkets.length} quoted</span>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {liveMarkets.map((market) => (
                <Link key={market.id} href={marketDetailHref(market)} className="group overflow-hidden rounded-2xl border border-white/10 bg-[#0b1612] transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-[#0e1b16]">
                  <div className="relative aspect-[16/8.5] overflow-hidden bg-black/25">
                    {market.imageUrl ? (
                      <Image src={market.imageUrl} alt="" fill className="object-cover transition duration-300 group-hover:scale-[1.02]" sizes="(max-width: 768px) 100vw, 33vw" />
                    ) : (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(52,211,153,.16),transparent_45%)]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b1612] via-transparent to-transparent" />
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

        <section className="mt-5 rounded-3xl border border-white/10 bg-[#0b1c15] p-6">
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
                  className="rounded-2xl border border-white/10 bg-black/15 p-5 transition hover:border-emerald-300/30"
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

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.035] p-6">
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
