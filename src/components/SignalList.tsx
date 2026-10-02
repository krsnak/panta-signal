"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { MarketSignal } from "@/lib/signal-model";

type ApiResponse = {
  signals?: MarketSignal[];
  error?: string;
};

function pct(value: number | null) {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function compact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function kindLabel(signal: MarketSignal) {
  if (signal.kind === "movement") return "Movement";
  if (signal.kind === "activity") return "Activity";
  if (signal.kind === "flat") return "Flat";
  return "Collecting";
}

function primaryMetric(signal: MarketSignal) {
  if (signal.kind === "movement") {
    const change = signal.movement.changePoints ?? 0;
    return `${change >= 0 ? "+" : ""}${change.toFixed(1)} pts`;
  }
  if (signal.kind === "activity" && signal.activity24h) {
    return `${signal.activity24h.tradeCount24h} trades`;
  }
  if (signal.kind === "flat") return "0.0 pts";
  return `${signal.movement.observationCount} obs`;
}

function secondaryMetric(signal: MarketSignal) {
  if (signal.activity24h && signal.activity24h.tradeCount24h > 0) {
    return `YES ${compact(signal.activity24h.yesShares24h)} · NO ${compact(signal.activity24h.noShares24h)} shares`;
  }
  return `${signal.movement.observationCount} durable observations`;
}

export default function SignalList({
  excludeMarketId,
}: {
  excludeMarketId?: string | null;
}) {
  const [signals, setSignals] = useState<MarketSignal[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: "5" });
    if (excludeMarketId) params.set("excludeMarketId", excludeMarketId);

    fetch(`/api/panta/signals?${params.toString()}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const body = (await response.json()) as ApiResponse;
        if (!response.ok || !body.signals) {
          throw new Error(body.error || "Signal feed unavailable");
        }
        setSignals(body.signals);
      })
      .catch((err) => {
        if ((err as Error).name !== "AbortError") {
          setError((err as Error).message);
        }
      });

    return () => controller.abort();
  }, [excludeMarketId]);

  if (error) {
    return (
      <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] p-5 text-sm leading-6 text-amber-100/60">
        Additional signals are temporarily unavailable. The primary signal above remains live.
      </div>
    );
  }

  if (signals === null) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/15 p-5 text-sm text-white/40">
        Loading observed signals…
      </div>
    );
  }

  if (signals.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/15 p-5 text-sm leading-6 text-white/45">
        No additional observed market qualifies yet. The list will populate only when another market has real durable observations or trading activity.
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#20282e]">
      {signals.map((signal, index) => (
        <Link
          key={signal.market.id}
          href={`/markets/${encodeURIComponent(signal.market.id)}`}
          className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[28px_1fr_auto] sm:items-center"
        >
          <div className="text-xs font-semibold text-white/20">{index + 1}</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/45">
                {kindLabel(signal)}
              </span>
              <span className="text-[11px] text-white/25">{signal.quoteState}</span>
            </div>
            <div className="mt-2 line-clamp-1 text-sm font-medium text-white/80">
              {signal.market.title}
            </div>
            <div className="mt-1 text-xs text-white/35">{secondaryMetric(signal)}</div>
          </div>
          <div className="flex items-end justify-between gap-5 sm:block sm:text-right">
            <div
              className={`text-base font-semibold ${
                signal.kind === "movement" && (signal.movement.changePoints ?? 0) > 0
                  ? "text-emerald-200"
                  : signal.kind === "movement" && (signal.movement.changePoints ?? 0) < 0
                    ? "text-rose-200"
                    : "text-white/80"
              }`}
            >
              {primaryMetric(signal)}
            </div>
            <div className="mt-1 text-xs text-white/35">
              YES {pct(signal.current.yesProbability)} · NO {pct(signal.current.noProbability)}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
