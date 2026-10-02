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
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const parsed = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(parsed.error || `Request failed (${response.status})`);
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

export default function PrimaryBuyPanel({ marketId, enabled }: { marketId: string; enabled: boolean }) {
  const { wallet, provider, connect, connecting, error: walletError } = useSolanaWallet();
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("5.00");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [order, setOrder] = useState<BuiltOrder | null>(null);
  const [receipt, setReceipt] = useState<ExecutionReceipt | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function connectWallet() {
    try {
      setBusy(true);
      await connect();
      setQuote(null);
      setOrder(null);
      setReceipt(null);
      setStatus("Wallet connected.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Wallet connection failed.");
    } finally {
      setBusy(false);
    }
  }

  async function requestQuote() {
    if (!wallet) return setStatus("Connect a wallet first.");
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return setStatus("Enter a valid positive USDC amount.");
    }
    try {
      setBusy(true);
      setOrder(null);
      setReceipt(null);
      const result = await postJson<Quote>("/api/panta/orders/quote", {
        wallet,
        marketId,
        side,
        amountUsdc: amount,
      });
      setQuote(result);
      setStatus("Quote ready. Review it before building the transaction.");
    } catch (error) {
      setQuote(null);
      setStatus(error instanceof Error ? error.message : "Quote failed.");
    } finally {
      setBusy(false);
    }
  }

  async function buildOrder() {
    if (!quote || !wallet) return;
    try {
      setBusy(true);
      setReceipt(null);
      const result = await postJson<BuiltOrder>("/api/panta/orders/build", {
        quoteId: quote.quoteId,
        wallet,
        maxSlippageBps: 100,
      });
      setOrder(result);
      setStatus("Unsigned transaction built. Your wallet will show the final signing request.");
    } catch (error) {
      setOrder(null);
      setStatus(error instanceof Error ? error.message : "Build failed.");
    } finally {
      setBusy(false);
    }
  }

  async function signAndSubmit() {
    if (!order || !wallet) return;
    if (!provider) return setStatus("Solana wallet is no longer available.");

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
        setStatus("Confirmed by Panta. The Solana transaction receipt is available below.");
        window.dispatchEvent(
          new CustomEvent("panta:order-confirmed", {
            detail: { wallet, marketId, signature: sent.signature },
          }),
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
  const flowStep = receipt
    ? receipt.status === "confirmed"
      ? 5
      : 4
    : order
      ? 3
      : quote
        ? 2
        : wallet
          ? 1
          : 0;

  if (!enabled) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/15 p-5 text-sm text-white/45">
        Primary buy is available only while the market is in its primary phase.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-1.5">
        {["Wallet", "Quote", "Build", "Sign", "Verify"].map((label, index) => {
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
            Primary-market purchases use USDC on Solana. Your wallet remains under your control and must approve every transaction before anything is broadcast.
          </p>
        </div>
        <button
          type="button"
          disabled={busy || connecting}
          onClick={connectWallet}
          className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-2.5 text-sm font-medium text-emerald-200 disabled:opacity-50"
        >
          {wallet ? `Phantom ${wallet.slice(0, 4)}…${wallet.slice(-4)}` : connecting ? "Connecting…" : "Connect Phantom"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto]">
        <div className="flex rounded-xl border border-white/10 bg-black/20 p-1">
          {(["yes", "no"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => { setSide(value); setQuote(null); setOrder(null); setReceipt(null); }}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${side === value ? (value === "yes" ? "bg-emerald-300 text-[#07110d]" : "bg-rose-300 text-[#07110d]") : "text-white/45"}`}
            >
              {value.toUpperCase()}
            </button>
          ))}
        </div>
        <input
          value={amount}
          onChange={(event) => { setAmount(event.target.value); setQuote(null); setOrder(null); setReceipt(null); }}
          inputMode="decimal"
          aria-label="USDC amount"
          className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
          placeholder="5.00 USDC"
        />
        <button
          type="button"
          disabled={busy || !wallet}
          onClick={requestQuote}
          className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#07110d] disabled:opacity-40"
        >
          Get quote
        </button>
      </div>

      <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.04] px-4 py-3 text-xs leading-5 text-amber-100/65">
        Trading involves risk and you can lose the USDC used to acquire a position. Prices are market-driven and are not financial advice.
      </div>

      {quote && (
        <div className="rounded-2xl border border-white/10 bg-black/15 p-5">
          <div className="grid gap-4 sm:grid-cols-4">
            <div><div className="text-xs text-white/35">Deposit</div><div className="mt-1 font-medium">{quote.amountUsdc} USDC</div></div>
            <div><div className="text-xs text-white/35">Est. shares</div><div className="mt-1 font-medium">{quote.shares}</div></div>
            <div><div className="text-xs text-white/35">Avg. price</div><div className="mt-1 font-medium">{quote.avgPrice ?? "—"}</div></div>
            <div><div className="text-xs text-white/35">Protocol fee</div><div className="mt-1 font-medium">{quote.feeUsdc} USDC</div></div>
          </div>
          {quote.disclaimer && <p className="mt-4 text-xs leading-5 text-amber-200/70">{quote.disclaimer}</p>}
          {!order && (
            <button
              type="button"
              disabled={busy}
              onClick={buildOrder}
              className="mt-5 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white/75 disabled:opacity-40"
            >
              Build unsigned transaction
            </button>
          )}
        </div>
      )}

      {order && (
        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.05] p-5">
          <p className="text-sm leading-6 text-white/60">
            {order.instructions.length > 0
              ? "Panta returned unsigned Solana instructions. Only your wallet can approve and sign them. Review the wallet prompt before broadcasting."
              : "Panta test mode returned a sandbox build preview with no on-chain instructions. Nothing can be signed or broadcast from this fixture."}
          </p>
          {order.disclaimer && <p className="mt-3 text-xs leading-5 text-amber-200/70">{order.disclaimer}</p>}
          {order.instructions.length > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={signAndSubmit}
              className="mt-4 rounded-xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-[#07110d] disabled:opacity-40"
            >
              Review, sign & send in wallet
            </button>
          )}
        </div>
      )}

      {receipt && (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-white/30">Solana receipt</div>
              <div className="mt-2 text-sm font-medium text-white/75">Panta status: {receipt.status}</div>
              <div className="mt-1 max-w-xl truncate font-mono text-xs text-white/35">{receipt.signature}</div>
            </div>
            <a
              href={explorerUrl(receipt.signature)}
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
