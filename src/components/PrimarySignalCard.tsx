"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  describeMarketSignal,
  formatSignalWindow,
  type MarketSignal,
} from "@/lib/signal-model";

type FallbackMarket = {
  id: string;
  title: string;
  category: string;
  yesProbability: number | null;
  noProbability: number | null;
  volumeUsdc: number;
};

type ApiResponse = {
  signal?: MarketSignal;
  error?: string;
};

function pct(value: number | null) {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function compact(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    notation: "compact",
  }).format(value);
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function freshness(seconds: number | null) {
  if (seconds === null) return "unknown";
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  return `${(seconds / 3600).toFixed(1)}h ago`;
}

function signalLabel(signal: MarketSignal) {
  if (signal.kind === "movement") return "Probability move";
  if (signal.kind === "activity") return "Trading activity";
  if (signal.kind === "flat") return "Flat probability";
  if (signal.kind === "resolved") return "Resolved";
  return "Building history";
}

function plainSignalTakeaway(signal: MarketSignal) {
  const change = signal.movement.changePoints;
  const trades = signal.activity24h?.tradeCount24h ?? 0;
  if (change !== null && Math.abs(change) >= 0.5) {
    return `Probability moved ${change > 0 ? "up" : "down"} ${Math.abs(change).toFixed(1)} points, with ${trades} public trade${trades === 1 ? "" : "s"} in the last 24h.`;
  }
  if (trades > 0) {
    return `Probability is broadly stable, but the market recorded ${trades} public trade${trades === 1 ? "" : "s"} in the last 24h.`;
  }
  return "No meaningful probability move or recent trading activity is currently confirmed.";
}

export default function PrimarySignalCard({
  fallback,
  href,
}: {
  fallback: FallbackMarket;
  href: string;
}) {
  const [signal, setSignal] = useState<MarketSignal | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/panta/signals/${encodeURIComponent(fallback.id)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const body = (await response.json()) as ApiResponse;
        if (!response.ok || !body.signal) {
          throw new Error(body.error || "Signal unavailable");
        }
        setSignal(body.signal);
      })
      .catch((err) => {
        if ((err as Error).name !== "AbortError") {
          setError((err as Error).message);
        }
      });
    return () => controller.abort();
  }, [fallback.id]);

  const yes = signal?.current.yesProbability ?? fallback.yesProbability;
  const no = signal?.current.noProbability ?? fallback.noProbability;
  const activity = signal?.activity24h ?? null;
  const change = signal?.movement.changePoints ?? null;
  const quoteState = signal?.quoteState ?? "loading";
  const stale = signal?.current.freshnessState === "stale";

  return (
    <section id="featured" className="overflow-hidden rounded-2xl border border-[#263038] bg-[#0f1418] shadow-xl shadow-black/15">
      <div className="border-b border-[#20282e] px-5 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Signal Feed
            </span>
            <span className="text-xs text-white/35">{signal ? signalLabel(signal) : "Loading live signal…"}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className={`rounded-full px-2.5 py-1 ${quoteState === "live" ? "bg-emerald-300/10 text-emerald-200" : quoteState === "cached" || stale ? "bg-amber-300/10 text-amber-200" : "bg-white/[0.06] text-white/45"}`}>
              {quoteState}{stale ? " · stale" : ""}
            </span>
            {signal && <span className="text-white/30">updated {freshness(signal.current.ageSeconds)}</span>}
          </div>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.35fr_.65fr]">
        <div className="p-5 sm:p-6 lg:p-7">
          <div className="text-xs uppercase tracking-[0.16em] text-white/30">{fallback.category}</div>
          <h2 className="mt-2 max-w-4xl text-2xl font-semibold leading-tight tracking-[-0.025em] sm:text-3xl">
            {signal?.market.title ?? fallback.title}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-5 text-white/50">
            {signal ? describeMarketSignal(signal) : "Combining Panta market detail, durable price history and the public trade tape into one signal."}
          </p>
          {signal && (
            <div className="mt-3 rounded-xl border border-emerald-300/10 bg-emerald-300/[0.04] px-4 py-2.5 text-sm leading-5 text-white/70">
              {plainSignalTakeaway(signal)}
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3.5">
              <div className="text-[10px] uppercase tracking-[0.14em] text-white/30">Price movement</div>
              <div className={`mt-2 text-2xl font-semibold ${change === null ? "text-white/65" : change > 0 ? "text-emerald-200" : change < 0 ? "text-rose-200" : "text-white/80"}`}>
                {change === null ? "Collecting" : `${change >= 0 ? "+" : ""}${change.toFixed(1)} pts`}
              </div>
              <div className="mt-1 text-xs text-white/30">{signal ? `${signal.movement.observationCount} obs · ${formatSignalWindow(signal.movement.windowSeconds)}` : "durable history"}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3.5">
              <div className="text-[10px] uppercase tracking-[0.14em] text-white/30">24h trades</div>
              <div className="mt-2 text-2xl font-semibold">{activity ? activity.tradeCount24h : signal?.activityState === "unavailable" ? "—" : "…"}</div>
              <div className="mt-1 text-xs text-white/30">
                {activity
                  ? `${compact(activity.primaryCount24h)} primary · last trade ${freshness(activity.latestTradeAgeSeconds)}`
                  : "public trade tape"}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3.5">
              <div className="text-[10px] uppercase tracking-[0.14em] text-white/30">Market volume</div>
              <div className="mt-2 text-2xl font-semibold">{money(signal?.current.volumeUsdc ?? fallback.volumeUsdc)}</div>
              <div className="mt-1 text-xs text-white/30">Panta market detail</div>
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] px-4 py-3 text-xs leading-5 text-amber-100/60">
              Live signal refresh failed. Showing the best available fallback data without treating it as a fresh signal.
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href={href} className="inline-flex rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#090d10] transition hover:bg-white/90">
              Inspect signal →
            </Link>
            <span className="text-xs text-white/30">Real Panta data · no synthetic movement</span>
          </div>
        </div>

        <div className="border-t border-[#20282e] bg-[#0b0f12] p-5 sm:p-6 lg:border-l lg:border-t-0 lg:p-7">
          <div className="text-xs uppercase tracking-[0.16em] text-white/30">Current probability</div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] p-4">
              <div className="text-xs font-medium text-white/35">YES</div>
              <div className="mt-2 text-4xl font-semibold text-emerald-200">{pct(yes)}</div>
            </div>
            <div className="rounded-xl border border-rose-300/15 bg-rose-300/[0.05] p-4">
              <div className="text-xs font-medium text-white/35">NO</div>
              <div className="mt-2 text-4xl font-semibold text-rose-200">{pct(no)}</div>
            </div>
          </div>
          <div className="mt-4 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-2 bg-emerald-300/70 transition-all" style={{ width: `${Math.max(0, Math.min(100, (yes ?? 0) * 100))}%` }} />
          </div>
          <div className="mt-5 space-y-2.5 border-t border-white/10 pt-4 text-xs">
            <div className="flex justify-between gap-4"><span className="text-white/30">Signal</span><span className="text-white/70">{signal ? signalLabel(signal) : "Loading"}</span></div>
            <div className="flex justify-between gap-4"><span className="text-white/30">Freshness</span><span className="text-white/70">{signal ? freshness(signal.current.ageSeconds) : "…"}</span></div>
            <div className="flex justify-between gap-4"><span className="text-white/30">Evidence</span><span className="text-white/70">{activity ? `${activity.tradeCount24h} trades / 24h` : "loading"}</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}
