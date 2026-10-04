"use client";

import { useState } from "react";
import { Buffer } from "buffer";
import {
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { useSolanaWallet } from "@/components/SolanaWalletProvider";
import WalletConnectButton from "@/components/WalletConnectButton";

type Quote = {
  quoteId: string;
  side: string;
  amountUsdc: string;
  shares: string;
  avgPrice?: string;
  feeUsdc: string;
  expiresAt: string;
  disclaimer?: string;
};

type BuiltOrder = {
  orderId: string;
  expectedShares?: string;
  feeUsdc?: string;
  recentBlockhash: string;
  instructions: Array<{
    programId: string;
    data: string;
    accounts: Array<{
      pubkey: string;
      isSigner: boolean;
      isWritable: boolean;
    }>;
  }>;
  disclaimer?: string;
};

type ExecutionReceipt = {
  signature: string;
  status: string;
  indexed?: boolean;
};

class ApiError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const parsed = await response.json() as T & { error?: string; code?: string };
  if (!response.ok) {
    throw new ApiError(
      parsed.error || `Request failed (${response.status})`,
      response.status,
      parsed.code,
    );
  }
  return parsed;
}

function decodeBase64(value: string) {
  return Buffer.from(value, "base64");
}

function explorerUrl(signature: string) {
  return `https://explorer.solana.com/tx/${encodeURIComponent(signature)}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pantaMarketUrl(marketId: string, title: string) {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80)
      .replace(/-+$/g, "") || "market";
  return `https://www.panta.market/market/${encodeURIComponent(marketId)}/${slug}`;
}

export default function PrimaryBuyPanel({
  marketId,
  phase,
  title,
  quoteAsset,
  recentSecondaryFills = 0,
  secondaryLiquidity = null,
}: {
  marketId: string;
  phase: string;
  title: string;
  quoteAsset?: string | null;
  recentSecondaryFills?: number;
  secondaryLiquidity?: {
    activeOrders: number;
    buyOpportunities: number;
    sellOpportunities: number;
  } | null;
}) {
  const { wallet, provider, error: walletError } = useSolanaWallet();
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("1.00");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [order, setOrder] = useState<BuiltOrder | null>(null);
  const [receipt, setReceipt] = useState<ExecutionReceipt | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [flowWallet, setFlowWallet] = useState("");

  async function prepareOrder() {
    if (!wallet) return setStatus("Connect a wallet first.");
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return setStatus("Enter a valid positive USDC amount.");
    }
    try {
      setBusy(true);
      setOrder(null);
      setReceipt(null);
      setStatus("Preparing live Panta quote…");
      let activeQuote = await postJson<Quote>("/api/panta/orders/quote", {
        wallet,
        marketId,
        side,
        amountUsdc: amount,
      });
      setQuote(activeQuote);
      setFlowWallet(wallet);

      let result: BuiltOrder;
      try {
        setStatus("Preparing unsigned Solana transaction…");
        result = await postJson<BuiltOrder>("/api/panta/orders/build", {
          quoteId: activeQuote.quoteId,
          wallet,
          maxSlippageBps: 100,
        });
      } catch (error) {
        if (!(error instanceof ApiError) || error.code !== "INVALID_MARKET_PARAMS") {
          throw error;
        }
        setStatus("Refreshing quote and retrying once…");
        activeQuote = await postJson<Quote>("/api/panta/orders/quote", {
          wallet,
          marketId,
          side,
          amountUsdc: amount,
        });
        setQuote(activeQuote);
        result = await postJson<BuiltOrder>("/api/panta/orders/build", {
          quoteId: activeQuote.quoteId,
          wallet,
          maxSlippageBps: 100,
        });
      }
      setOrder(result);
      setStatus("Trade prepared. Review the final transfers in your Solana wallet before confirming.");
    } catch (error) {
      setQuote(null);
      setOrder(null);
      if (error instanceof ApiError && error.code === "INVALID_MARKET_PARAMS") {
        setStatus("Panta could not prepare this trade for the current wallet/market. Nothing was signed or sent.");
      } else {
        setStatus(error instanceof Error ? error.message : "Unable to prepare trade.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function signAndSubmit() {
    if (!order || !wallet) return;
    if (!provider) return setStatus("Solana wallet is no longer available.");
    if (provider.isConnected === false) {
      return setStatus("Wallet is disconnected. Reconnect your Solana wallet before signing.");
    }
    const activeWallet = provider.publicKey?.toString() ?? "";
    if (!activeWallet || activeWallet !== wallet) {
      return setStatus("Connected wallet changed. Reconnect and request a fresh quote before signing.");
    }
    if (flowWallet !== wallet) {
      return setStatus("This transaction was built for a different wallet. Request a fresh quote.");
    }

    try {
      setBusy(true);
      const instructions = order.instructions.map(
        (instruction) =>
          new TransactionInstruction({
            programId: new PublicKey(instruction.programId),
            keys: instruction.accounts.map((account) => ({
              pubkey: new PublicKey(account.pubkey),
              isSigner: account.isSigner,
              isWritable: account.isWritable,
            })),
            data: decodeBase64(instruction.data),
          }),
      );

      const message = new TransactionMessage({
        payerKey: new PublicKey(wallet),
        recentBlockhash: order.recentBlockhash,
        instructions,
      }).compileToV0Message();
      const transaction = new VersionedTransaction(message);

      setStatus("Waiting for wallet approval…");
      const sent = await provider.signAndSendTransaction(transaction);
      setStatus("Transaction broadcast. Registering signature with Panta…");
      setReceipt({ signature: sent.signature, status: "submitted" });

      await postJson("/api/panta/orders/submit", {
        orderId: order.orderId,
        signature: sent.signature,
        wallet,
      });

      let verifiedStatus = "submitted";
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const verified = await postJson<{ status: string }>("/api/panta/orders/verify", {
          orderId: order.orderId,
          signature: sent.signature,
          wallet,
        });
        verifiedStatus = verified.status;
        setReceipt({ signature: sent.signature, status: verifiedStatus });
        if (["confirmed", "failed", "expired"].includes(verifiedStatus)) break;
        await sleep(1500);
      }

      if (verifiedStatus === "confirmed") {
        setStatus("Confirmed by Panta. Checking the public Panta trade feed for this exact Solana signature…");
        window.dispatchEvent(
          new CustomEvent("panta:order-confirmed", {
            detail: { wallet, marketId, signature: sent.signature },
          }),
        );
        let indexed = false;
        for (let attempt = 0; attempt < 10; attempt += 1) {
          try {
            const response = await fetch(
              `/api/panta/markets/${encodeURIComponent(marketId)}/activity?signature=${encodeURIComponent(sent.signature)}&t=${Date.now()}`,
              { cache: "no-store" },
            );
            if (response.ok) {
              const body = await response.json() as {
                trades?: Array<{ signature?: string }>;
              };
              indexed = Boolean(body.trades?.some((trade) => trade.signature === sent.signature));
              if (indexed) break;
            }
          } catch {
            // Panta trade indexing can lag the transaction confirmation.
          }
          await sleep(2000);
        }
        setReceipt({ signature: sent.signature, status: verifiedStatus, indexed });
        setStatus(
          indexed
            ? "Confirmed end-to-end: the same Solana signature is now visible in the public Panta trade feed used by Panta Signal."
            : "Transaction confirmed. Panta trade-feed indexing is still pending; the Solana receipt remains independently verifiable.",
        );
      } else if (verifiedStatus === "failed" || verifiedStatus === "expired") {
        setStatus(`Panta order ended with status: ${verifiedStatus}.`);
      } else {
        setStatus("Transaction was broadcast, but Panta confirmation is still pending. Use the receipt below to verify it on-chain.");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Signing or submission failed.");
    } finally {
      setBusy(false);
    }
  }

  const visibleStatus = status || walletError || "";
  const flowMatchesWallet = !flowWallet || flowWallet === wallet;
  const visibleQuote = flowMatchesWallet ? quote : null;
  const visibleOrder = flowMatchesWallet ? order : null;
  const visibleReceipt = flowMatchesWallet ? receipt : null;
  const flowStep = visibleReceipt
    ? visibleReceipt.status === "confirmed"
      ? 3
      : 2
    : visibleOrder
      ? 2
      : wallet
        ? 1
        : 0;

  if (phase === "secondary") {
    const hasImmediateLiquidity = (secondaryLiquidity?.activeOrders ?? 0) > 0;
    return (
      <div className="space-y-3 rounded-2xl border border-white/10 bg-black/15 p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/30">Secondary market</div>
        <div className="text-base font-semibold text-white/80">Continue to Panta&apos;s live order book</div>
        <p className="text-sm leading-6 text-white/40">
          This market trades through Panta&apos;s secondary limit-order market. Panta Signal keeps the signal and verification layer here, then hands execution to the official Panta trading interface instead of recreating or simulating its order book.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-[0.14em] text-white/30">Trade asset</div>
            <div className="mt-1 text-sm font-semibold text-white/70">{quoteAsset || "Check on Panta"}</div>
          </div>
          <div className={`rounded-xl border px-3 py-2.5 ${
            secondaryLiquidity === null
              ? "border-white/8 bg-white/[0.03]"
              : hasImmediateLiquidity
                ? "border-emerald-300/20 bg-emerald-300/[0.06]"
                : "border-amber-300/20 bg-amber-300/[0.05]"
          }`}>
            <div className="text-[10px] uppercase tracking-[0.14em] text-white/30">Immediate liquidity</div>
            <div className={`mt-1 text-sm font-semibold ${
              secondaryLiquidity === null
                ? "text-white/55"
                : hasImmediateLiquidity
                  ? "text-emerald-200"
                  : "text-amber-100/80"
            }`}>
              {secondaryLiquidity === null
                ? "On-chain check unavailable"
                : hasImmediateLiquidity
                  ? "Tradeable now"
                  : "No immediate counterparty"}
            </div>
            {secondaryLiquidity && (
              <div className="mt-1 text-[11px] text-white/35">
                Buy {secondaryLiquidity.buyOpportunities} · Sell {secondaryLiquidity.sellOpportunities}
              </div>
            )}
          </div>
        </div>
        <p className="text-[11px] leading-5 text-white/35">
          {secondaryLiquidity === null
            ? "Panta Signal could not verify the live order book on-chain right now. Check Panta before placing a demo order."
            : hasImmediateLiquidity
              ? `Live Panta OrderNode accounts show executable counterparties now. ${recentSecondaryFills > 0 ? `${recentSecondaryFills} secondary fill${recentSecondaryFills === 1 ? "" : "s"} also appeared in the last 24h.` : "No completed secondary fill was confirmed in the last 24h."}`
              : `No executable counterparty is visible on-chain now. A new limit order can still be placed on Panta, but it may rest unfilled. ${recentSecondaryFills > 0 ? `${recentSecondaryFills} secondary fill${recentSecondaryFills === 1 ? "" : "s"} appeared in the last 24h.` : ""}`}
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href={pantaMarketUrl(marketId, title)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-[#07110d] transition hover:bg-emerald-200"
          >
            {hasImmediateLiquidity ? "Open live orders on Panta ↗" : "Open Panta order book ↗"}
          </a>
        </div>
        <div className="text-[11px] leading-5 text-white/30">
          Secondary execution remains Panta-native and uses Panta&apos;s own login, embedded wallet and order book. No custom order-book logic or synthetic fill is introduced by Panta Signal.
        </div>
      </div>
    );
  }

  if (phase !== "primary") {
    return (
      <div className="space-y-3 rounded-2xl border border-white/10 bg-black/15 p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/30">Trade on Panta</div>
        <div className="text-base font-semibold text-white/75">Trading is not available for this market state.</div>
        <p className="text-sm leading-6 text-white/40">
          Panta Signal only exposes execution when Panta reports a supported primary or secondary trading phase.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1.5">
        {["Wallet", "Review", "Confirm"].map((label, index) => {
          const complete = flowStep > index;
          const current = flowStep === index;
          return (
            <div key={label} className="min-w-0">
              <div className={`h-1.5 rounded-full ${complete ? "bg-emerald-300" : current ? "bg-white/45" : "bg-white/10"}`} />
              <div className={`mt-1.5 truncate text-[10px] uppercase tracking-wide ${complete ? "text-emerald-200" : current ? "text-white/60" : "text-white/25"}`}>
                {label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm uppercase tracking-[0.18em] text-white/35">Primary market · non-custodial</div>
          <h2 className="mt-2 text-2xl font-semibold">Buy YES / NO on Panta</h2>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-white/40">
            Primary-market purchases can be executed directly with an external Solana wallet. Phantom is currently supported. Panta&apos;s native secondary trading remains in the official Panta interface.
          </p>
        </div>
        <WalletConnectButton />
      </div>

      <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto]">
        <div className="flex rounded-xl border border-white/10 bg-black/20 p-1">
          {(["yes", "no"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => { setSide(value); setQuote(null); setOrder(null); setReceipt(null); setFlowWallet(""); }}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${side === value ? (value === "yes" ? "bg-emerald-300 text-[#07110d]" : "bg-rose-300 text-[#07110d]") : "text-white/45"}`}
            >
              {value.toUpperCase()}
            </button>
          ))}
        </div>
        <input
          value={amount}
          onChange={(event) => { setAmount(event.target.value); setQuote(null); setOrder(null); setReceipt(null); setFlowWallet(""); }}
          inputMode="decimal"
          aria-label="USDC amount"
          className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
          placeholder="5.00 USDC"
        />
        <button
          type="button"
          disabled={busy || !wallet}
          onClick={prepareOrder}
          className="rounded-xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-[#07110d] disabled:opacity-40"
        >
          {busy ? "Preparing…" : `Review ${side.toUpperCase()} · ${amount} USDC`}
        </button>
      </div>

      <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.04] px-4 py-3 text-xs leading-5 text-amber-100/65">
        Trading involves risk and you can lose the USDC used to acquire a position. Prices are market-driven and are not financial advice.
      </div>

      {visibleQuote && visibleOrder && (
        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.05] p-5">
          <div className="grid gap-4 sm:grid-cols-4">
            <div><div className="text-xs text-white/35">Deposit</div><div className="mt-1 font-medium">{visibleQuote.amountUsdc} USDC</div></div>
            <div><div className="text-xs text-white/35">Est. shares</div><div className="mt-1 font-medium">{visibleQuote.shares}</div></div>
            <div><div className="text-xs text-white/35">Avg. price</div><div className="mt-1 font-medium">{visibleQuote.avgPrice ?? "—"}</div></div>
            <div><div className="text-xs text-white/35">Protocol fee</div><div className="mt-1 font-medium">{visibleQuote.feeUsdc} USDC</div></div>
          </div>
          {visibleQuote.disclaimer && <p className="mt-4 text-xs leading-5 text-amber-200/70">{visibleQuote.disclaimer}</p>}
          {visibleOrder.instructions.length > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void signAndSubmit()}
              className="mt-5 w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#07110d] disabled:opacity-40"
            >
              Review & confirm in wallet
            </button>
          )}
        </div>
      )}

      {visibleReceipt && (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-white/30">Solana receipt</div>
              <div className="mt-2 text-sm font-medium text-white/75">Panta status: {visibleReceipt.status}</div>
              {visibleReceipt.status === "confirmed" && (
                <div className={`mt-1 text-xs font-medium ${visibleReceipt.indexed ? "text-emerald-200" : "text-amber-200"}`}>
                  {visibleReceipt.indexed ? "Visible in Panta Signal trade evidence" : "Waiting for public trade-feed indexing"}
                </div>
              )}
              <div className="mt-1 max-w-xl truncate font-mono text-xs text-white/35">{visibleReceipt.signature}</div>
            </div>
            <a
              href={explorerUrl(visibleReceipt.signature)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white/75 transition hover:border-white/25 hover:text-white"
            >
              Open in Solana Explorer ↗
            </a>
          </div>
        </div>
      )}

      {visibleStatus && <div className="text-sm leading-6 text-white/45">{visibleStatus}</div>}
      <p className="text-xs leading-5 text-white/30">Market prices can move and quotes expire. This interface does not provide financial advice.</p>
    </div>
  );
}
