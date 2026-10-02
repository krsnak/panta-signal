"use client";

import { useEffect, useRef, useState } from "react";

type Activity = {
  tradeCount24h: number;
  primaryCount24h: number;
  secondaryCount24h: number;
  yesShares24h: number;
  noShares24h: number;
  latestTradeAt: number | null;
  observedRows: number;
};

type ApiResponse = {
  activity?: Activity;
  error?: string;
};

function compact(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function relativeTime(timestamp: number | null) {
  if (!timestamp) return "no recent trade";
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function MarketActivitySignal({
  marketId,
  title,
}: {
  marketId: string;
  title: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "160px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    fetch(`/api/panta/markets/${encodeURIComponent(marketId)}/activity`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = (await response.json()) as ApiResponse;
        if (!response.ok || !body.activity) {
          throw new Error(body.error || "Activity unavailable");
        }
        setActivity(body.activity);
      })
      .catch((err) => {
        if ((err as Error).name !== "AbortError") setError(true);
      });
    return () => controller.abort();
  }, [marketId, visible]);

  return (
    <div ref={ref} className="rounded-2xl border border-white/10 bg-black/15 p-4">
      <div className="line-clamp-2 text-sm font-medium text-white/80">{title}</div>
      {!activity && !error && (
        <div className="mt-3 text-xs text-white/30">Loading trade activity…</div>
      )}
      {error && (
        <div className="mt-3 text-xs text-white/30">Trade activity temporarily unavailable.</div>
      )}
      {activity && (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-white/25">24h trades</div>
              <div className="mt-1 text-lg font-semibold">{activity.tradeCount24h}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-white/25">YES shares</div>
              <div className="mt-1 text-lg font-semibold text-emerald-200">{compact(activity.yesShares24h)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-white/25">NO shares</div>
              <div className="mt-1 text-lg font-semibold text-rose-200">{compact(activity.noShares24h)}</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/30">
            <span>{activity.primaryCount24h} primary</span>
            <span>{activity.secondaryCount24h} secondary</span>
            <span>last trade {relativeTime(activity.latestTradeAt)}</span>
          </div>
        </>
      )}
    </div>
  );
}
