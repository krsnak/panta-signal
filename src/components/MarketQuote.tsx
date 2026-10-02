"use client";

import { useEffect, useRef, useState } from "react";

type MarketQuoteProps = {
  marketId: string;
  compact?: boolean;
};

type ApiResponse = {
  market?: {
    yesProbability: number | null;
    noProbability: number | null;
  };
};

function pct(value: number | null) {
  if (value === null) return "—";
  if (value === 0 || value === 1) return `${value * 100}%`;
  return `${(value * 100).toFixed(1)}%`;
}

export default function MarketQuote({ marketId, compact = false }: MarketQuoteProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [quote, setQuote] = useState<{ yes: number | null; no: number | null } | null>(null);
  const [failed, setFailed] = useState(false);

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
      { rootMargin: "180px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    fetch(`/api/panta/markets/${encodeURIComponent(marketId)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("quote unavailable");
        const body = (await response.json()) as ApiResponse;
        setQuote({
          yes: body.market?.yesProbability ?? null,
          no: body.market?.noProbability ?? null,
        });
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") setFailed(true);
      });
    return () => controller.abort();
  }, [marketId, visible]);

  if (compact) {
    return (
      <div ref={ref} className="flex items-center gap-3 text-xs">
        <span className="text-emerald-300/75">YES {quote ? pct(quote.yes) : "…"}</span>
        <span className="text-rose-300/75">NO {quote ? pct(quote.no) : "…"}</span>
        {failed && <span className="text-white/25">quote unavailable</span>}
      </div>
    );
  }

  return (
    <div ref={ref}>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-emerald-300/[0.08] px-3 py-2.5 text-emerald-200">
          <span className="text-xs text-white/35">YES</span>
          <span className="float-right font-semibold">{quote ? pct(quote.yes) : "…"}</span>
        </div>
        <div className="rounded-xl bg-rose-300/[0.07] px-3 py-2.5 text-rose-200">
          <span className="text-xs text-white/35">NO</span>
          <span className="float-right font-semibold">{quote ? pct(quote.no) : "…"}</span>
        </div>
      </div>
      <div className="mt-2 text-[11px] text-white/25">
        {failed ? "Live quote unavailable" : quote ? "Live quote" : "Loading live quote…"}
      </div>
    </div>
  );
}
