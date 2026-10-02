"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { MarketSignal } from "@/lib/signal-model";

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

function duration(seconds: number | null) {
  if (seconds === null) return "collecting";
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
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

function signalSummary(signal: MarketSignal) {
  const change = signal.movement.changePoints;
  const activity = signal.activity24h;
  if (signal.kind === "movement" && change !== null) {
    return `YES moved ${change >= 0 ? "+" : ""}${change.toFixed(1)} pts across ${duration(signal.movement.windowSeconds)}, based on ${signal.movement.observationCount} real observations.`;
  }
  if (signal.kind === "activity" && activity) {
    return `Probability is flat across ${signal.movement.observationCount} observations, but ${activity.tradeCount24h} trades moved ${compact(activity.yesShares24h)} YES and ${compact(activity.noShares24h)} NO shares in the last 24h.`;
  }
  if (signal.kind === "flat") {
    return `No material probability move is visible across ${signal.movement.observationCount} stored observations. Panta Signal keeps the market visible without inventing a mover.`;
  }
  if (signal.kind === "resolved") {
    return "This market is resolved, so it is not promoted as an active trading signal.";
  }
  return "The current quote is available, but more durable observations are required before a movement signal can be calculated.";
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
  const quoteState = signal?.quoteState ?? "cached";

  return (
    <section id="featured" className="overflow-hidden rounded-[28px] border border-[#263038] bg-[#0f1418] shadow-2xl shadow-black/20">
      <div className="border-b border-[#20282e] px-6 py-4 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Signal Feed
            </span>
            <span className="text-xs text-white/35">{signal ? signalLabel(signal) : "Loading live signal…"}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className={`rounded-full px-2.5 py-1 ${quoteState === "live" ? "bg-emerald-300/10 text-emerald-200" : quoteState === "cached" ? "bg-amber-300/10 text-amber-200" : "bg-white/[0.06] text-white/45"}`}>
              {quoteState}
            </span>
            {signal && <span className="text-white/30">updated {freshness(signal.current.ageSeconds)}</span>}
          </div>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.25fr_.75fr]">
        <div className="p-6 sm:p-8 lg:p-10">
          <div className="text-xs uppercase tracking-[0.16em] text-white/30">{fallback.category}</div>
          <h2 className="mt-3 max-w-4xl text-3xl font-semibold leading-tight tracking-[-0.025em] sm:text-4xl">
            {signal?.market.title ?? fallback.title}
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/50">
            {signal ? signalSummary(signal) : "Combining Panta market detail, durable price history and the public trade tape into one signal."}
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-[10px] uppercase tracking-[0.14em] text-white/30">Price movement</div>
              <div className={`mt-2 text-2xl font-semibold ${change === null ? "text-white/65" : change > 0 ? "text-emerald-200" : change < 0 ? "text-rose-200" : "text-white/80"}`}>
                {change === null ? "Collecting" : `${change >= 0 ? "+" : ""}${change.toFixed(1)} pts`}
              </div>
              <div className="mt-1 text-xs text-white/30">{signal ? `${signal.movement.observationCount} obs · ${duration(signal.movement.windowSeconds)}` : "durable history"}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-[10px] uppercase tracking-[0.14em] text-white/30">24h trades</div>
              <div className="mt-2 text-2xl font-semibold">{activity ? activity.tradeCount24h : signal?.activityState === "unavailable" ? "—" : "…"}</div>
              <div className="mt-1 text-xs text-white/30">{activity ? `${compact(activity.primaryCount24h)} primary · ${compact(activity.secondaryCount24h)} secondary` : "public trade tape"}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-[10px] uppercase tracking-[0.14em] text-white/30">24h shares</div>
              <div className="mt-2 text-lg font-semibold text-emerald-200">YES {activity ? compact(activity.yesShares24h) : "—"}</div>
              <div className="mt-1 text-sm font-medium text-rose-200">NO {activity ? compact(activity.noShares24h) : "—"}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-[10px] uppercase tracking-[0.14em] text-white/30">Market volume</div>
              <div className="mt-2 text-2xl font-semibold">{money(signal?.current.volumeUsdc ?? fallback.volumeUsdc)}</div>
              <div className="mt-1 text-xs text-white/30">Panta market detail</div>
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] px-4 py-3 text-xs leading-5 text-amber-100/60">
              Live signal refresh failed. Showing the latest stored market observation instead.
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href={href} className="inline-flex rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#090d10] transition hover:bg-white/90">
              Inspect signal →
            </Link>
            <span className="text-xs text-white/30">Real Panta data · no synthetic movement</span>
          </div>
        </div>

        <div className="border-t border-[#20282e] bg-[#0b0f12] p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
          <div className="text-xs uppercase tracking-[0.16em] text-white/30">Current probability</div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] p-5">
              <div className="text-xs font-medium text-white/35">YES</div>
              <div className="mt-2 text-4xl font-semibold text-emerald-200">{pct(yes)}</div>
            </div>
            <div className="rounded-2xl border border-rose-300/15 bg-rose-300/[0.05] p-5">
              <div className="text-xs font-medium text-white/35">NO</div>
              <div className="mt-2 text-4xl font-semibold text-rose-200">{pct(no)}</div>
            </div>
          </div>
          <div className="mt-4 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-2 bg-emerald-300/70 transition-all" style={{ width: `${Math.max(0, Math.min(100, (yes ?? 0) * 100))}%` }} />
          </div>
          <div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-xs">
            <div className="flex justify-between gap-4"><span className="text-white/30">Signal type</span><span className="text-white/70">{signal ? signalLabel(signal) : "Loading"}</span></div>
            <div className="flex justify-between gap-4"><span className="text-white/30">Observations</span><span className="text-white/70">{signal?.movement.observationCount ?? "…"}</span></div>
            <div className="flex justify-between gap-4"><span className="text-white/30">Activity data</span><span className="text-white/70">{signal?.activityState ?? "loading"}</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}
