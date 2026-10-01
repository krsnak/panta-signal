import Link from "next/link";
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

  return (
    <main className="min-h-screen bg-[#07110d] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-7 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3 text-sm text-emerald-300">
              <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1">Panta API Sidetrack</span>
              <span className="text-white/45">Crypto World&apos;s Fair</span>
            </div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Panta Signal</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-white/60">Prediction-market intelligence focused on movement, context and actionable market discovery.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
            <div className="text-white/45">Data mode</div>
            <div className="mt-1 font-medium text-emerald-300">{snapshot.source === "panta" ? "Live Panta API" : "Sample data"}</div>
          </div>
        </header>

        {snapshot.source !== "panta" && (
          <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-sm text-amber-100">Live Panta API configuration is not set yet, so the UI is running on clearly labeled sample data.</div>
        )}

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.035] p-5">
          <form className="grid gap-3 md:grid-cols-[1fr_180px_160px_auto]" action="/">
            <input
              name="q"
              defaultValue={params.q || ""}
              placeholder="Search title, description or category"
              className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none placeholder:text-white/30"
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
            <button className="rounded-xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-[#07110d]">Explore</button>
          </form>
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.035] p-6">
          <div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-sm uppercase tracking-[0.18em] text-white/35">Market explorer</div>
                <h2 className="mt-2 text-2xl font-semibold">Live market catalog</h2>
              </div>
              <span className="text-sm text-white/35">{snapshot.markets.length} markets</span>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {snapshot.markets.map((market) => (
                <article key={market.id} className="rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-emerald-300/30 hover:bg-white/[0.035]">
                  <div className="flex items-start justify-between gap-4">
                    <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-white/50">{market.category}</span>
                    <span className="text-xs uppercase tracking-wider text-white/35">{market.phase}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-medium leading-7">{market.title}</h3>
                  {market.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/40">{market.description}</p>}
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] p-3">
                      <div className="text-xs uppercase tracking-wider text-white/35">YES</div>
                      <div className="mt-1 text-2xl font-semibold text-emerald-200">{pct(market.yesProbability)}</div>
                    </div>
                    <div className="rounded-xl border border-rose-300/15 bg-rose-300/[0.05] p-3">
                      <div className="text-xs uppercase tracking-wider text-white/35">NO</div>
                      <div className="mt-1 text-2xl font-semibold text-rose-200">{pct(market.noProbability)}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-white/35">
                    <span>{market.status}</span>
                    <span>{money(market.volumeUsdc)} volume</span>
                  </div>
                  <Link
                    href={`/markets/${encodeURIComponent(market.id)}`}
                    className="mt-5 inline-flex text-sm font-medium text-emerald-300 hover:text-emerald-200"
                  >
                    Open market detail →
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

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
                  href={`/markets/${encodeURIComponent(mover.market.id)}`}
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
